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
import { filtrarNav } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: string;        // permissão exigida; se ausente, item é público (autenticado)
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Filtra o menu conforme as permissões do usuário (lógica pura em @/lib/permissions).
export function filterNav(groups: NavGroup[], perms: string[]): NavGroup[] {
  return filtrarNav(groups, perms) as NavGroup[];
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
      { label: "Usuários", href: "/usuarios", icon: Users, perm: "adm.usuarios" },
      { label: "Perfis e permissões", href: "/perfis", icon: ShieldCheck, perm: "adm.config" },
      { label: "Configurações", href: "/configuracoes", icon: Settings, perm: "adm.config" },
    ],
  },
];
