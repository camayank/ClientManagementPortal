import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";

type RequestResult = {
  ok: true;
  user?: SelectUser;
  accessToken?: string;
  refreshToken?: string;
} | {
  ok: false;
  message: string;
};

type LoginData = {
  username: string;
  password: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: LoginData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      return { ok: false, message };
    }

    const data = await response.json();
    return { ok: true, ...data };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<SelectUser | null> {
  const response = await fetch('/api/auth/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['/api/auth/user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/auth/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['/api/auth/user'], data.user);
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/auth/logout', 'POST'),
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
    },
  });

  const registerMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/auth/register', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  return {
    user,
    isLoading,
    error,
    isAdmin: user?.role === 'admin',
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}