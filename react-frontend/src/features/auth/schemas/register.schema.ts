import { z } from 'zod';

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên'),
  email: z.string().min(1, 'Email không được để trống').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirm_password: z.string().min(6, 'Xác nhận mật khẩu phải từ 6 ký tự'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
