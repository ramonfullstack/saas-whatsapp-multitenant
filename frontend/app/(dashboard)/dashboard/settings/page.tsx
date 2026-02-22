'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface WhatsAppAccount {
  id: string;
  sessionName: string;
  status: string;
  phoneNumber: string | null;
}

export default function SettingsPage() {
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'AGENT' });
  const [newAccount, setNewAccount] = useState({ sessionName: '' });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<User[]>('/users'),
  });

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => apiGet<WhatsAppAccount[]>('/whatsapp/accounts'),
  });

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    await apiPost('/users', { ...newUser, role: newUser.role });
    setNewUser({ name: '', email: '', password: '', role: 'AGENT' });
    refetchUsers();
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    await apiPost('/whatsapp/accounts', { sessionName: newAccount.sessionName });
    setNewAccount({ sessionName: '' });
    refetchAccounts();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Configurações</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários da empresa (OWNER, ADMIN, AGENT).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                placeholder="Nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                placeholder="email@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser((u) => ({ ...u, role: v }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">Agente</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
          <ul className="border rounded-md divide-y">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-muted-foreground">{u.email} · {u.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <p className="text-sm text-muted-foreground">
            Conecte instâncias via Evolution API. Crie a instância na Evolution e informe o nome aqui.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateAccount} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Nome da sessão (Evolution API)</Label>
              <Input
                value={newAccount.sessionName}
                onChange={(e) => setNewAccount({ sessionName: e.target.value })}
                placeholder="ex: minha-empresa"
                required
              />
            </div>
            <Button type="submit">Adicionar conta</Button>
          </form>
          <ul className="border rounded-md divide-y">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="font-medium">{a.sessionName}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {a.status} {a.phoneNumber && ` · ${a.phoneNumber}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
