import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authConfig: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email e senha são obrigatórios");
                }

                const user = await prisma.crmUser.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    throw new Error("Email ou senha inválidos");
                }

                const isPasswordValid = await compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Email ou senha inválidos");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 4 * 60 * 60, // Reduzido para 4 horas (segurança A07)
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            // Verificação ativa: garante que o usuário ainda existe no banco
            if (token.id) {
                const dbUser = await prisma.crmUser.findUnique({
                    where: { id: token.id as string },
                    select: { id: true, role: true },
                });
                
                if (!dbUser) {
                    // Se o usuário foi deletado, forçamos a invalidação da sessão
                    throw new Error("Usuário não encontrado no banco de dados");
                }
                
                if (session.user) {
                    session.user.id = dbUser.id;
                    session.user.role = dbUser.role;
                }
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
};
