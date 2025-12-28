import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string | null;  // 普通用户可能没有用户名
      name: string;
      phone: string;
      role: string;
      cityId: string | null;
      cityName: string | null;
    };
  }

  interface User {
    id: string;
    username: string | null;  // 普通用户可能没有用户名
    name: string;
    phone: string;
    role: string;
    cityId: string | null;
    cityName: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string | null;  // 普通用户可能没有用户名
    name: string;
    phone: string;
    role: string;
    cityId: string | null;
    cityName: string | null;
  }
}
