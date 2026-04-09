import { useEffect, useMemo, useState } from 'react';

import { AssignableUser, listAssignableUsers } from '../lib/users';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';

const MANUAL_OPTION = '__manual__';

function normalizeText(value?: string | null): string {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getUserDisplayName(user: AssignableUser): string {
  return user.fullName?.trim() || user.username;
}

function getUserOptionLabel(user: AssignableUser): string {
  const name = getUserDisplayName(user);
  const details = [user.username, user.department].filter(Boolean).join(' · ');
  return details ? `${name} (${details})` : name;
}

function matchesUser(user: AssignableUser, value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  return [
    user.fullName,
    user.username,
    user.email
  ].some((entry) => normalizeText(entry) === normalized);
}

interface ResponsavelOperacionalFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ResponsavelOperacionalField({
  label = 'Responsável operacional',
  value,
  onChange,
  placeholder = 'Servidor(a) responsável pelo acompanhamento'
}: ResponsavelOperacionalFieldProps) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setLoading(true);
      try {
        const nextUsers = await listAssignableUsers();
        if (ignore) {
          return;
        }
        setUsers(nextUsers);
        setLoadError(null);
      } catch {
        if (ignore) {
          return;
        }
        setUsers([]);
        setLoadError('A lista de usuários não pôde ser carregada neste momento. Você ainda pode informar manualmente.');
        setManualMode(true);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, []);

  const matchedUser = useMemo(
    () => users.find((user) => matchesUser(user, value)) ?? null,
    [users, value]
  );

  useEffect(() => {
    if (!value.trim()) {
      setManualMode(false);
      return;
    }

    if (!loading) {
      setManualMode(!matchedUser);
    }
  }, [loading, matchedUser, value]);

  const selectValue = manualMode ? MANUAL_OPTION : matchedUser?.id;

  const handleSelectChange = (nextValue: string) => {
    if (nextValue === MANUAL_OPTION) {
      setManualMode(true);
      return;
    }

    const selectedUser = users.find((user) => user.id === nextValue);
    if (!selectedUser) {
      return;
    }

    setManualMode(false);
    onChange(getUserDisplayName(selectedUser));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={selectValue} onValueChange={handleSelectChange} disabled={loading}>
        <SelectTrigger className="rounded-2xl">
          <SelectValue placeholder={loading ? 'Carregando usuários...' : 'Selecione um usuário'} />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {getUserOptionLabel(user)}
            </SelectItem>
          ))}
          {users.length > 0 && <SelectSeparator />}
          <SelectItem value={MANUAL_OPTION}>Adicionar manualmente</SelectItem>
        </SelectContent>
      </Select>

      {(manualMode || !users.length) && (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="rounded-2xl"
        />
      )}

      <p className="text-xs text-muted-foreground">
        {loadError || 'Selecione um usuário ativo da base compartilhada ou use a opção manual se o nome ainda não existir.'}
      </p>
    </div>
  );
}
