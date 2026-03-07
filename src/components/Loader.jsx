export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary-200 rounded-full animate-spin border-t-primary-600"></div>
      </div>
      <p className="mt-4 text-gray-500 text-sm font-medium">{text}</p>
    </div>
  );
}
