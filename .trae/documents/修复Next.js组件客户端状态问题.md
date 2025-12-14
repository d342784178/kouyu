1. 修复`BottomNav`组件：在文件顶部添加`'use client'`指令，使其成为Client Component
2. 检查并修复`phrase-library/page.tsx`：添加`'use client'`指令，因为它使用了`useState`、`useEffect`和`useSearchParams`
3. 检查并修复`phrase-detail/page.tsx`：添加`'use client'`指令，因为它使用了`useState`、`useEffect`、`useSearchParams`和`useRouter`
4. 验证修复：检查开发服务器日志，确保没有编译错误
5. 测试应用：使用浏览器访问应用，确保所有页面都能正常加载和工作

