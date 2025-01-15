
import { LayoutDashboard, Target, FileText, Pill, TestTube2, Bell, UserCircle } from 'lucide-react';

function NavigationBar() {
  return (
    <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
      <div className="w-32" />
      <div className="flex gap-2 bg-gray-300 backdrop-blur-sm px-1 py-1 rounded-full z-10 border-2 border-white">
        <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
          <LayoutDashboard className="w-5 h-5 group-hover:text-blue-500" />
          <span className="text-sm group-hover:text-black">Dashboard</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
          <Target className="w-5 h-5 group-hover:text-blue-500" />
          <span className="text-sm group-hover:text-black">Goals</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
          <FileText className="w-5 h-5 group-hover:text-blue-500" />
          <span className="text-sm group-hover:text-black">Report</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
          <Pill className="w-5 h-5 group-hover:text-blue-500" />
          <span className="text-sm group-hover:text-black">Supplements</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
          <TestTube2 className="w-5 h-5 group-hover:text-blue-500" />
          <span className="text-sm group-hover:text-black">Tests</span>
        </button>
      </div>
      <div className="flex items-center gap-3 pr-4">
        <button className="relative w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
          <Bell className="w-4 h-4 text-gray-600" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
          <UserCircle className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </nav>
  );
}

export default NavigationBar;