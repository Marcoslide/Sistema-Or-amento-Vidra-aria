import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  UserCog,
  Landmark,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Orçamentos", href: "/orcamentos", icon: FileText },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Produtos", href: "/produtos", icon: Package },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Vendedores", href: "/vendedores", icon: UserCog },
      { label: "Contas de Recebimento", href: "/contas", icon: Landmark },
      { label: "Operadoras de Cartão", href: "/operadoras", icon: CreditCard },
    ],
  },
  {
    title: "Sistema",
    items: [{ label: "Configurações", href: "/configuracoes", icon: Settings }],
  },
];
