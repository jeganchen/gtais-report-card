/**
 * NextAuth 认证配置
 * 支持Credentials和Office 365登录，用户必须存在于数据库才能登录
 * Azure AD 配置从数据库 Settings 表读取
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { z } from 'zod';
import { userRepository } from '@/lib/database/repositories';
import { getAzureADConfig } from '@/lib/azure-config';

// 环境检测
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 登录表单验证schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// 使用 top-level await 预加载数据库配置
// 这确保在 NextAuth 初始化前，配置已从数据库加载
const azureConfig = await getAzureADConfig();

// 仅在开发环境输出配置状态（不输出敏感信息）
if (!IS_PRODUCTION) {
  console.log('[Auth] Azure AD Config loaded:', {
    hasClientId: !!azureConfig.clientId,
    hasClientSecret: !!azureConfig.clientSecret,
    hasTenantId: !!azureConfig.tenantId,
    enabled: azureConfig.enabled,
  });
}

// 检查是否有完整的 Azure AD 配置
const hasAzureConfig = !!(azureConfig.clientId && azureConfig.clientSecret && azureConfig.tenantId);

if (!IS_PRODUCTION) {
  if (hasAzureConfig) {
    console.log('[Auth] MicrosoftEntraID provider enabled');
  } else {
    console.log('[Auth] MicrosoftEntraID provider NOT added - missing config');
  }
}

// 构建 providers 数组 - 使用条件表达式避免类型推断问题
const providers = [
  // 用户名密码登录
  Credentials({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      try {
        const { email, password } = loginSchema.parse(credentials);

        // 数据库验证 - 生产环境必须使用数据库
        const user = await userRepository.findByEmail(email);
        
        if (!user || !user.isActive) {
          if (!IS_PRODUCTION) {
            console.log('[Auth] User not found or inactive:', email);
          }
          return null;
        }

        // 验证密码
        const isValid = await userRepository.verifyPassword(email, password);
        if (!isValid) {
          if (!IS_PRODUCTION) {
            console.log('[Auth] Invalid password for:', email);
          }
          return null;
        }

        // 更新最后登录时间
        await userRepository.updateLastLogin(email);

        return {
          id: user.email,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        };
      } catch (error) {
        if (!IS_PRODUCTION) {
          console.error('[Auth] Authorization error:', error);
        }
        return null;
      }
    },
  }),
  // 只有当 Azure AD 配置完整时才添加 MicrosoftEntraID provider
  // 关键：必须提供 issuer 来指定租户，否则会使用 /common 端点导致单租户应用报错
  ...(hasAzureConfig
    ? [
        MicrosoftEntraID({
          clientId: azureConfig.clientId!,
          clientSecret: azureConfig.clientSecret!,
          // 通过 issuer 指定租户（tenantId 已被移除，改用 issuer）
          issuer: `https://login.microsoftonline.com/${azureConfig.tenantId}/v2.0`,
          authorization: {
            params: {
              scope: 'openid profile email User.Read',
            },
          },
        }),
      ]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    /**
     * 登录验证回调
     * Office 365用户必须在数据库中存在才能登录
     */
    async signIn({ user, account }) {
      // Credentials登录已在authorize中验证
      if (account?.provider === 'credentials') {
        return true;
      }

      // Office 365登录需要验证用户是否在数据库中
      if (account?.provider === 'microsoft-entra-id') {
        // 先检查 Azure AD 是否启用
        const config = await getAzureADConfig();
        if (!config.enabled) {
          if (!IS_PRODUCTION) {
            console.log('[Auth] Office 365 login is disabled');
          }
          return '/login?error=O365Disabled';
        }

        if (!user.email) {
          if (!IS_PRODUCTION) {
            console.log('[Auth] Office 365 login failed: no email');
          }
          return false;
        }

        try {
          const dbUser = await userRepository.findByEmail(user.email);
          
          if (!dbUser) {
            if (!IS_PRODUCTION) {
              console.log('[Auth] Office 365 user not found in database:', user.email);
            }
            return '/login?error=UserNotFound';
          }

          if (!dbUser.isActive) {
            if (!IS_PRODUCTION) {
              console.log('[Auth] Office 365 user is inactive:', user.email);
            }
            return '/login?error=UserInactive';
          }

          // 更新最后登录时间
          await userRepository.updateLastLogin(user.email);
          
          return true;
        } catch (error) {
          if (!IS_PRODUCTION) {
            console.error('[Auth] Database error during Office 365 sign in:', error);
          }
          return '/login?error=DatabaseError';
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        
        // 从数据库获取用户角色
        if (user.email) {
          try {
            const dbUser = await userRepository.findByEmail(user.email);
            token.role = dbUser?.role || 'teacher';
          } catch {
            token.role = 'teacher';
          }
        } else {
          token.role = (user as { role?: string }).role || 'teacher';
        }
      }
      
      // Office 365登录时补充用户信息
      if (account?.provider === 'microsoft-entra-id' && token.email) {
        token.id = token.email;
        try {
          const dbUser = await userRepository.findByEmail(token.email as string);
          if (dbUser) {
            token.role = dbUser.role;
            token.name = dbUser.name || token.name;
          }
        } catch {
          // 忽略错误，使用默认值
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // 登录成功后跳转到学生列表页
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/students`;
      }
      // 允许相对路径重定向
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // 允许同源重定向
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return `${baseUrl}/students`;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  debug: process.env.NODE_ENV === 'development',
});

// 扩展Session类型
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }

  interface User {
    role?: string;
  }
}
