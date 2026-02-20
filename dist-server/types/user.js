export function sanitizeUser(user) {
    const role = user.role ?? (user.isAdmin ? 'admin' : 'viewer');
    return {
        id: user._id?.toString() || '',
        username: user.username,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        email: user.email ?? null,
        isAdmin: role === 'admin',
        role,
        fullName: user.fullName,
        department: user.department
    };
}
