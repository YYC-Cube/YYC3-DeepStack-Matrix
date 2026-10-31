import { test, expect } from '@playwright/test';

test('customer management flow', async ({ page }) => {
  await page.goto('/customers');
  
  // 点击添加客户按钮
  await page.click('button:has-text("添加客户")');
  
  // 填写表单
  await page.fill('input[name="name"]', 'Test Customer');
  await page.fill('input[name="email"]', 'test@example.com');
  
  // 提交表单
  await page.click('button:has-text("提交")');
  
  // 验证成功消息
  await expect(page.locator('.success-message')).toBeVisible();
});
