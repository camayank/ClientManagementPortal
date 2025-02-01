import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Handle authentication errors
            throw new Error("Authentication required");
          }

          if (res.status >= 500) {
            throw new Error(`Server error: ${res.status} ${res.statusText}`);
          }

          const errorText = await res.text();
          throw new Error(errorText || `Request failed with status ${res.status}`);
        }

        return res.json();
      },
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error instanceof Error && error.message === "Authentication required") {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
    },
    mutations: {
      retry: false,
    }
  },
});