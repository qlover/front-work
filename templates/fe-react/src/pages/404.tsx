export default function NotFound({ route }: { route?: string }) {
  return (
    <div className="flex flex-col justify-center min-h-screen py-6 bg-gray-100 sm:py-12">
      <div className="relative py-3 mx-auto sm:max-w-xl">
        <h1 className="text-2xl font-bold text-center">
          404 - {route ? `不存在组件: ${route}` : '页面不存在'}
        </h1>
      </div>
    </div>
  );
}