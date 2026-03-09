import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Auto-detect deployment URL: use NEXTAUTH_URL if set, else use Vercel's auto-injected VERCEL_URL
const siteUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                role: { label: "Role", type: "text" },
            },
            async authorize(credentials) {
                // Demo credentials — replace with DB lookup in production
                const USERS = [
                    { id: "1", email: "official@gov.in", password: "official123", name: "Secretary General", role: "official" },
                    { id: "2", email: "citizen@india.in", password: "citizen123", name: "Aarav Sharma", role: "user" },
                ];
                const user = USERS.find(
                    (u) => u.email === credentials?.email && u.password === credentials?.password
                );
                if (!user) return null;
                return { id: user.id, email: user.email, name: user.name, role: user.role };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.role = (user as { role?: string }).role;
            return token;
        },
        async session({ session, token }) {
            if (session.user) (session.user as { role?: string }).role = token.role as string;
            return session;
        },
    },
    pages: { signIn: "/" },
    secret: process.env.NEXTAUTH_SECRET,
    ...(siteUrl && { url: siteUrl }),
});

export { handler as GET, handler as POST };

