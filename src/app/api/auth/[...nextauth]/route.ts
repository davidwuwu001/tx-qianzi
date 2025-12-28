import NextAuth, { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyCode } from '@/services/verification.service';

export const authOptions: NextAuthOptions = {
  providers: [
    // 统一的凭证登录（支持用户名密码和验证码）
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
        phone: { label: '手机号', type: 'text' },
        code: { label: '验证码', type: 'text' },
        loginType: { label: '登录类型', type: 'text' }, // 'password' 或 'code'
        adminType: { label: '管理员类型', type: 'text' }, // 'system' 或 'city'
      },
      async authorize(credentials): Promise<User | null> {
        const loginType = credentials?.loginType || 'password';

        // 验证码登录
        if (loginType === 'code') {
          if (!credentials?.phone || !credentials?.code) {
            throw new Error('请输入手机号和验证码');
          }

          // 验证验证码
          const verifyResult = await verifyCode(credentials.phone, credentials.code);
          if (!verifyResult.success) {
            throw new Error(verifyResult.error || '验证码错误');
          }

          // 查找用户
          const user = await prisma.user.findUnique({
            where: { phone: credentials.phone },
          });

          if (!user) {
            throw new Error('该手机号未注册');
          }

          if (!user.isActive) {
            throw new Error('账户已被禁用，请联系管理员');
          }

          // 获取城市名称
          let cityName: string | null = null;
          if (user.cityId) {
            const city = await prisma.city.findUnique({
              where: { id: user.cityId },
            });
            cityName = city?.name || null;
          }

          // 更新最后登录时间
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            role: user.role,
            cityId: user.cityId,
            cityName,
          };
        }

        // 用户名密码登录 - 从数据库查找用户
        if (!credentials?.username || !credentials?.password) {
          throw new Error('请输入用户名和密码');
        }

        // 从数据库查找用户
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: {
            City: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error('用户名或密码错误');
        }

        if (!user.isActive) {
          throw new Error('账户已被禁用，请联系管理员');
        }

        // 验证密码（使用 bcrypt）
        const bcrypt = await import('bcrypt');
        if (!user.password) {
          throw new Error('该用户未设置密码，请使用验证码登录');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error('用户名或密码错误');
        }

        // 更新最后登录时间
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // 返回用户信息
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          role: user.role,
          cityId: user.cityId,
          cityName: user.City?.name || null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.phone = user.phone;
        token.role = user.role;
        token.cityId = user.cityId;
        token.cityName = user.cityName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          username: token.username as string | null,
          name: token.name as string,
          phone: token.phone as string,
          role: token.role as string,
          cityId: token.cityId as string | null,
          cityName: token.cityName as string | null,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
