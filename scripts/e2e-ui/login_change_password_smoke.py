"""
E2E-UI 冒烟 · 登录→首登改密全链路(2026-11-18 入库;表单反馈规范断言样板)
断言:①临时密码登录跳改密页 ②纯数字新密码提交→出现 [role=alert] 行内错误(防 toast 静默回归)
③合格密码提交→跳工作台 ④新密码重登成功
运行(需 Playwright chromium,装一次):/opt/miniconda3/bin/playwright install chromium-headless-shell
  python3 scripts/e2e-ui/login_change_password_smoke.py <BASE> <phone> <tempPassword>
示例:python3 scripts/e2e-ui/login_change_password_smoke.py http://127.0.0.1:3040 13911112222 123456
注意:每次跑消耗一个临时密码账号——跑前建号(POST /staff/users)或先重置目标账号密码
"""
import asyncio
import sys

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3040'
PHONE = sys.argv[2] if len(sys.argv) > 2 else '13911112222'
PASSWORD = sys.argv[3] if len(sys.argv) > 3 else '123456'


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(
            viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
        )
        page = await ctx.new_page()
        page.on('pageerror', lambda e: print('PAGEERROR:', str(e)[:150]))

        # ① 临时密码登录(必跳改密页)
        await page.goto(BASE + '/#/login', wait_until='networkidle')
        await page.fill('input', PHONE)
        await page.fill('input[type="password"]', PASSWORD)
        await page.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('登')); b && b.click() }")
        await page.wait_for_url('**/#/change-password', timeout=15000)
        print('① 临时密码登录→改密页 ✓')

        # ② 纯数字新密码提交→[role=alert] 行内错误(核心断言:防 toast 静默回归)
        inputs = page.locator('input[type="password"]')
        await inputs.nth(0).fill(PASSWORD)
        await inputs.nth(1).fill('12345678')
        await inputs.nth(2).fill('12345678')
        await page.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('确认修改')); b && b.click() }")
        await page.wait_for_timeout(800)
        alert = await page.evaluate("() => { const e=document.querySelector('[role=alert]'); return e ? e.textContent.trim() : 'NO INLINE ERR' }")
        assert '字母与数字' in alert, '行内错误断言失败:' + alert
        print('② 行内错误断言 ✓', alert)

        # ③ 合格密码提交→工作台
        await inputs.nth(1).fill('Abcd1234')
        await inputs.nth(2).fill('Abcd1234')
        await page.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('确认修改')); b && b.click() }")
        await page.wait_for_url('**/#/m/workbench', timeout=15000)
        print('③ 合格提交→工作台 ✓')

        # ④ 退出→新密码重登
        await page.goto(BASE + '/#/login', wait_until='networkidle')
        await page.fill('input', PHONE)
        await page.fill('input[type="password"]', 'Abcd1234')
        await page.evaluate("() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('登')); b && b.click() }")
        await page.wait_for_url('**/#/m/workbench', timeout=15000)
        print('④ 新密码重登 ✓')

        await browser.close()
        print('SMOKE PASS')


asyncio.run(main())
