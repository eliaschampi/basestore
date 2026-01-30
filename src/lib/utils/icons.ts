/**
 * Icon Registry - Lucide Icons for Lumi UI
 * Static registry for tree-shaking optimization
 */

import type { Icon as LucideIcon } from 'lucide-svelte';
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowDown,
	ArrowRight,
	ArrowUp,
	Award,
	Bell,
	Bookmark,
	BookOpen,
	Calendar,
	ChartBar,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	ChevronUp,
	Clipboard,
	Clock,
	Cloud,
	CloudUpload,
	Coffee,
	Command,
	Copy,
	CreditCard,
	Download,
	Edit,
	Eye,
	EyeClosed,
	File as FileIcon,
	FileQuestion,
	FileText,
	Filter,
	Fingerprint,
	Folder,
	FolderPlus,
	Grid,
	Hand,
	HardDrive,
	Heart,
	Hexagon,
	Home,
	Image,
	Inbox,
	Info,
	Key,
	Link,
	List,
	ListChecks,
	ListFilter,
	Lock,
	LogOut,
	Mail,
	MapPin,
	Menu,
	MessageCircle,
	Moon,
	MoreVertical,
	Music,
	Newspaper,
	Phone,
	Plus,
	RefreshCcw,
	RotateCcw,
	Search,
	Send,
	Settings,
	Share2,
	Shield,
	Star,
	Sun,
	Tag,
	Timer,
	Trash2,
	TrendingUp,
	User,
	UserCheck,
	Users,
	Video,
	X,
	XCircle,
	Package,
	Building
} from 'lucide-svelte';
import type { ComponentType } from 'svelte';

// Icon registry type
export type IconComponent = ComponentType<LucideIcon>;

// Static icon registry - only includes icons we actually use
export const iconRegistry: Record<string, IconComponent> = {
	share: Share2,
	refresh: RefreshCcw,
	home: Home,
	settings: Settings,
	menu: Menu,
	moon: Moon,
	sun: Sun,
	chevronLeft: ChevronLeft,
	chevronRight: ChevronRight,
	chevronDown: ChevronDown,
	chevronUp: ChevronUp,
	chevronUpDown: ChevronsUpDown,
	user: User,
	search: Search,
	x: X,
	file: FileIcon,
	logOut: LogOut,
	users: Users,
	shield: Shield,
	bell: Bell,
	clipboard: Clipboard,
	copy: Copy,
	edit: Edit,
	command: Command,
	mail: Mail,
	phone: Phone,
	inbox: Inbox,
	calendar: Calendar,
	checkCircle: CheckCircle,
	xCircle: XCircle,
	alertTriangle: AlertTriangle,
	lock: Lock,
	plus: Plus,
	heart: Heart,
	dni: Fingerprint,
	eye: Eye,
	eyeOff: EyeClosed,
	check: Check,
	arrowRight: ArrowRight,
	arrowDown: ArrowDown,
	arrowUp: ArrowUp,
	clock: Clock,
	timer: Timer,
	shieldCheck: Shield,
	info: Info,
	coffee: Coffee,
	hand: Hand,
	send: Send,
	creditCard: CreditCard,
	hardDrive: HardDrive,
	cloud: Cloud,
	trash: Trash2,
	upload: CloudUpload,
	download: Download,
	list: List,
	grid: Grid,
	folder: Folder,
	folderPlus: FolderPlus,
	image: Image,
	tag: Tag,
	moreVertical: MoreVertical,
	rotateCcw: RotateCcw,
	fileText: FileText,
	video: Video,
	location: MapPin,
	userCheck: UserCheck,
	music: Music,
	feed: Newspaper,
	filterList: ListFilter,
	link: Link,
	messageCircle: MessageCircle,
	bookmark: Bookmark,
	hexagon: Hexagon,
	chartBar: ChartBar,
	alertCircle: AlertCircle,
	trendingUp: TrendingUp,
	activity: Activity,
	filter: Filter,
	award: Award,
	bookOpen: BookOpen,
	listChecks: ListChecks,
	fileQuestion: FileQuestion,
	star: Star,
	building: Building,
	package: Package,
	key: Key
};

/**
 * Get a specific icon from the registry
 * @param iconName - Name of the icon to retrieve
 * @returns Icon component or null if not found
 */
export function getIcon(iconName: string): IconComponent | null {
	const icon = iconRegistry[iconName];
	if (!icon) {
		console.warn(`Icon "${iconName}" not found. Available icons:`, Object.keys(iconRegistry));
		return null;
	}
	return icon;
}

/**
 * Check if an icon exists in the registry
 * @param iconName - Name of the icon to check
 * @returns True if icon exists, false otherwise
 */
export function hasIcon(iconName: string): boolean {
	return iconName in iconRegistry;
}

/**
 * Get all available icon names
 * @returns Array of all icon names in the registry
 */
export function getAvailableIcons(): string[] {
	return Object.keys(iconRegistry);
}
