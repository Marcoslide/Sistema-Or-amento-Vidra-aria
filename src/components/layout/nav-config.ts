import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  UserCog,
  Landmark,
  CreditCard,
  Settings,
  Store,
  Tags,
  Truck,
  ShieldCheck,
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
      { label: "Lojas e operações", href: "/lojas", icon: Store },
      { label: "Vendedores", href: "/vendedores", icon: UserCog },
      { label: "Famílias", href: "/familias", icon: Tags },
      { label: "Fornecedores", href: "/fornecedores", icon: Truck },
      { label: "Contas de Recebimento", href: "/contas", icon: Landmark },
      { label: "Operadoras de Cartão", href: "/operadoras", icon: CreditCard },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Usuários", href: "/usuarios", icon: Users },
      { label: "Perfis e permissões", href: "/perfis", icon: ShieldCheck },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];
