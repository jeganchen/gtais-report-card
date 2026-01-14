/**
 * 首页 - 重定向到学生列表
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/students');
}
