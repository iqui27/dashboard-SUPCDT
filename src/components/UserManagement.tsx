import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { listAdminUsers, createAdminUser, updateAdminUser, type AdminUser, type UserRole } from '../lib/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface UserManagementProps {
  currentUserId?: string;
}

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

type CreateUserFormState = {
  username: string;
  fullName: string;
  email: string;
  department: string;
  password: string;
  role: UserRole;
};

type EditUserState = {
  username: string;
  fullName: string;
  email: string;
  isActive: boolean;
  password: string;
  department: string;
  role: UserRole;
};

const INITIAL_CREATE_FORM: CreateUserFormState = {
  username: '',
  fullName: '',
  email: '',
  department: '',
  password: '',
  role: 'viewer'
};

const INITIAL_EDIT_STATE: EditUserState = {
  username: '',
  fullName: '',
  email: '',
  isActive: true,
  password: '',
  department: '',
  role: 'viewer'
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Visualizador' }
];

const ROLE_BADGE_VARIANTS: Record<UserRole, string> = {
  admin: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  editor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  viewer: 'bg-muted text-foreground border-border'
};

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [createForm, setCreateForm] = useState<CreateUserFormState>(INITIAL_CREATE_FORM);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditUserState>(INITIAL_EDIT_STATE);
  const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedUser = useMemo(() => users.find(user => user.id === selectedUserId) ?? null, [users, selectedUserId]);
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const needle = searchQuery.toLowerCase();
    return users.filter(user => {
      return [
        user.username,
        user.fullName ?? '',
        user.email ?? '',
        user.department ?? '',
        user.role
      ].some(value => value.toLowerCase().includes(needle));
    });
  }, [users, searchQuery]);
  const isSelf = selectedUser?.id === currentUserId;

  const loadUsers = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setFeedback(null);

    try {
      const data = await listAdminUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users', error);
      const message = error instanceof Error ? error.message : 'Erro ao listar usuários';
      setFeedback({ type: 'error', message });
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadUsers(true);
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUser) {
      setEditState({
        username: selectedUser.username,
        fullName: selectedUser.fullName ?? '',
        email: selectedUser.email ?? '',
        isActive: selectedUser.isActive,
        password: '',
        department: selectedUser.department ?? '',
        role: selectedUser.role
      });
    } else {
      setEditState(INITIAL_EDIT_STATE);
    }
  }, [selectedUser]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!createForm.username.trim() || !createForm.password.trim()) {
      setFeedback({ type: 'error', message: 'Usuário e senha são obrigatórios.' });
      return;
    }

    setIsCreating(true);
    try {
      await createAdminUser({
        username: createForm.username.trim(),
        password: createForm.password,
        fullName: createForm.fullName.trim() || undefined,
        email: createForm.email.trim() || undefined,
        department: createForm.department.trim() || undefined,
        isAdmin: createForm.role === 'admin',
        role: createForm.role
      });

      setCreateForm(INITIAL_CREATE_FORM);
      await loadUsers(false);
      setFeedback({ type: 'success', message: 'Usuário criado com sucesso.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar usuário';
      setFeedback({ type: 'error', message });
    } finally {
      setIsCreating(false);
    }
  };

  const updateUserInState = (updated: AdminUser) => {
    setUsers(prev => prev.map(user => user.id === updated.id ? updated : user));
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (user.id === currentUserId && user.isActive) {
      setFeedback({ type: 'error', message: 'Você não pode desativar o seu próprio usuário.' });
      return;
    }

    setFeedback(null);
    setMutatingUserId(user.id);

    try {
      const updated = await updateAdminUser(user.id, { isActive: !user.isActive });
      updateUserInState(updated);
      setFeedback({ type: 'success', message: `Usuário ${!user.isActive ? 'ativado' : 'desativado'} com sucesso.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status do usuário';
      setFeedback({ type: 'error', message });
    } finally {
      setMutatingUserId(null);
    }
  };

  const handleSetRole = async (user: AdminUser, nextRole: UserRole) => {
    if (user.role === nextRole) {
      return;
    }

    if (user.id === currentUserId && nextRole !== 'admin') {
      setFeedback({ type: 'error', message: 'Você não pode remover seu próprio acesso de administrador.' });
      return;
    }

    setFeedback(null);
    setMutatingUserId(user.id);

    try {
      const updated = await updateAdminUser(user.id, { role: nextRole });
      updateUserInState(updated);
      setFeedback({ type: 'success', message: `Perfil atualizado para ${ROLE_OPTIONS.find(option => option.value === nextRole)?.label ?? nextRole}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil do usuário';
      setFeedback({ type: 'error', message });
    } finally {
      setMutatingUserId(null);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    const newPassword = window.prompt(`Informe a nova senha para ${user.username}`);

    if (!newPassword) {
      return;
    }

    setFeedback(null);
    setMutatingUserId(user.id);

    try {
      const updated = await updateAdminUser(user.id, { password: newPassword.trim() });
      updateUserInState(updated);
      setFeedback({ type: 'success', message: 'Senha redefinida com sucesso.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao redefinir senha do usuário';
      setFeedback({ type: 'error', message });
    } finally {
      setMutatingUserId(null);
    }
  };

  const handleSelectUser = (user: AdminUser) => {
    if (selectedUserId === user.id) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId(user.id);
    setFeedback(null);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchTerm.trim());
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    const trimmedUsername = editState.username.trim();
    if (!trimmedUsername) {
      setFeedback({ type: 'error', message: 'Usuário é obrigatório.' });
      return;
    }

    if (isSelf && editState.role !== 'admin') {
      setFeedback({ type: 'error', message: 'Você não pode remover seu próprio acesso de administrador.' });
      return;
    }

    if (isSelf && !editState.isActive) {
      setFeedback({ type: 'error', message: 'Você não pode desativar o seu próprio usuário.' });
      return;
    }

    const hasUsernameChanged = trimmedUsername !== selectedUser.username;
    const payload = {
      fullName: editState.fullName.trim() || undefined,
      email: editState.email.trim() || undefined,
      isActive: editState.isActive,
      password: editState.password.trim() ? editState.password : undefined,
      department: editState.department.trim() || undefined,
      role: editState.role,
      isAdmin: editState.role === 'admin',
      username: hasUsernameChanged ? trimmedUsername : undefined
    };

    if (
      !hasUsernameChanged &&
      payload.fullName === (selectedUser.fullName ?? undefined) &&
      typeof payload.email === 'undefined' &&
      payload.isActive === selectedUser.isActive &&
      typeof payload.password === 'undefined' &&
      payload.department === (selectedUser.department ?? undefined) &&
      payload.role === selectedUser.role
    ) {
      setFeedback({ type: 'error', message: 'Nenhuma alteração encontrada.' });
      return;
    }

    setIsUpdating(true);
    try {
      console.log('Updating user with payload:', payload);
      const updated = await updateAdminUser(selectedUser.id, payload);
      console.log('Received updated user:', updated);
      setUsers(prev => prev.map(user => user.id === updated.id ? updated : user));
      setFeedback({ type: 'success', message: 'Usuário atualizado com sucesso.' });
      setEditState(current => ({ ...current, password: '' }));
    } catch (error) {
      console.error('Error updating user:', error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar usuário';
      setFeedback({ type: 'error', message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gerenciamento de usuários</h2>
          <p className="text-sm text-muted-foreground">Crie novos usuários e atualize permissões existentes.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <form className="flex w-full items-center gap-2 sm:w-auto" onSubmit={handleSearchSubmit}>
            <Input
              placeholder="Buscar por nome, usuário ou e-mail"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="w-full sm:min-w-[240px]"
              disabled={isLoading}
            />
            <Button type="submit" variant="secondary" disabled={isLoading}>
              Pesquisar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearSearch}
              disabled={isLoading || (!searchTerm && !searchQuery)}
            >
              Limpar
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            onClick={() => loadUsers(false)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2"
          >
            <Loader2 className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar lista
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>{feedback.type === 'error' ? 'Erro' : 'Sucesso'}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
          <CardDescription>Defina as credenciais iniciais do usuário. A senha pode ser alterada posteriormente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-username">Usuário</label>
              <Input
                id="new-username"
                value={createForm.username}
                onChange={event => setCreateForm(form => ({ ...form, username: event.target.value }))}
                placeholder="nome.sobrenome"
                required
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-fullname">Nome completo</label>
              <Input
                id="new-fullname"
                value={createForm.fullName}
                onChange={event => setCreateForm(form => ({ ...form, fullName: event.target.value }))}
                placeholder="Nome completo do usuário"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-email">E-mail (opcional)</label>
              <Input
                id="new-email"
                type="email"
                value={createForm.email}
                onChange={event => setCreateForm(form => ({ ...form, email: event.target.value }))}
                placeholder="usuario@secti.df.gov.br"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-department">Lotação (opcional)</label>
              <Input
                id="new-department"
                value={createForm.department}
                onChange={event => setCreateForm(form => ({ ...form, department: event.target.value }))}
                placeholder="Lotação / departamento"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-password">Senha</label>
              <Input
                id="new-password"
                type="password"
                value={createForm.password}
                onChange={event => setCreateForm(form => ({ ...form, password: event.target.value }))}
                placeholder="Senha temporária"
                required
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-role">Perfil</label>
              <Select
                value={createForm.role}
                onValueChange={value => setCreateForm(form => ({ ...form, role: value as UserRole }))}
                disabled={isCreating}
              >
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isCreating} className="inline-flex items-center gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar usuário
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
          <CardDescription>Visualize o status de cada usuário e acesse a edição para ajustar permissões.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nome completo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Lotação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const isUserSelected = user.id === selectedUserId;
                    return (
                      <TableRow key={user.id} className={isUserSelected ? 'bg-muted/40' : undefined}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.fullName ?? '—'}</TableCell>
                        <TableCell>{user.email ?? '—'}</TableCell>
                        <TableCell>{user.department ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'secondary' : 'outline'} className={user.isActive ? 'bg-green-500/10 text-green-600 border-green-500/20' : undefined}>
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ROLE_BADGE_VARIANTS[user.role]}>
                            {ROLE_OPTIONS.find(option => option.value === user.role)?.label ?? user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.lastLogin)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Select
                              value={user.role}
                              onValueChange={value => handleSetRole(user, value as UserRole)}
                              disabled={mutatingUserId === user.id || isRefreshing}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Perfil" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(user)}
                              disabled={mutatingUserId === user.id || isRefreshing}
                            >
                              {user.isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user)}
                              disabled={mutatingUserId === user.id || isRefreshing}
                            >
                              Resetar senha
                            </Button>
                            <Button
                              type="button"
                              variant={isUserSelected ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => handleSelectUser(user)}
                              disabled={mutatingUserId === user.id}
                            >
                              {isUserSelected ? 'Cancelar' : 'Editar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Editar usuário</CardTitle>
            <CardDescription>Atualize os dados do usuário selecionado e ajuste permissões conforme necessário.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleUpdateUser}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-username">Usuário</label>
                <Input
                  id="edit-username"
                  value={editState.username}
                  onChange={event => setEditState(state => ({ ...state, username: event.target.value }))}
                  placeholder="nome.sobrenome"
                  disabled={isUpdating}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-fullname">Nome completo</label>
                <Input
                  id="edit-fullname"
                  value={editState.fullName}
                  onChange={event => setEditState(state => ({ ...state, fullName: event.target.value }))}
                  placeholder="Nome completo do usuário"
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-email">E-mail</label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editState.email}
                  onChange={event => setEditState(state => ({ ...state, email: event.target.value }))}
                  placeholder="usuario@secti.df.gov.br"
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-department">Lotação</label>
                <Input
                  id="edit-department"
                  value={editState.department}
                  onChange={event => setEditState(state => ({ ...state, department: event.target.value }))}
                  placeholder="Lotação / departamento"
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-role">Perfil</label>
                <Select
                  value={editState.role}
                  onValueChange={value => setEditState(state => ({ ...state, role: value as UserRole }))}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="edit-role" className="w-full">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="edit-password">Nova senha (opcional)</label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editState.password}
                  onChange={event => setEditState(state => ({ ...state, password: event.target.value }))}
                  placeholder="Defina para resetar a senha"
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={editState.isActive}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setEditState(state => ({ ...state, isActive: event.target.checked }))}
                    disabled={isUpdating}
                  />
                  Usuário ativo
                </label>
              </div>

              <div className="md:col-span-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Última atualização: {formatDate(selectedUser.createdAt)}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedUserId(null)} disabled={isUpdating}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isUpdating} className="inline-flex items-center gap-2">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar alterações
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
