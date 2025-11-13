"use client";

import Link from 'next/link';
import { useAuth } from '@/providers/GlobalProvider';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Crop, 
    Package, 
    Map, 
    User, 
    LogOut,
    Store
} from 'lucide-react';

const SideBar = () => {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/cropper', label: 'Cropper', icon: Crop },
        { href: '/inventory', label: 'Inventory', icon: Package },
        { href: '/mapping', label: 'Mapping', icon: Map },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Store className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Store Manager
                    </h2>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-lg
                                transition-all duration-200 group
                                ${isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50' 
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-400">Store Admin</p>
                    </div>
                </div>
                
                <button
                    onClick={logout}
                    className="
                        w-full flex items-center justify-center gap-2 px-4 py-2.5
                        bg-red-600 hover:bg-red-700 text-white rounded-lg
                        transition-colors duration-200 font-medium
                        shadow-lg shadow-red-600/20 hover:shadow-red-600/40
                    "
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default SideBar;