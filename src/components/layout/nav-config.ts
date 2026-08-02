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
  Wallet,
  ArrowLeftRight,
  Receipt,
  Target,
  Building2,
  Clock,
  Cog,
  TrendingDown,
  Factory,
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
      { label: "Produção", href: "/producao", icon: Factory, perm: "prod.ver" },
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
    title: "Financeiro",
    items: [
      { label: "Contas a Receber", href: "/financeiro/receber", icon: Wallet, perm: "fin.contas_receber" },
      { label: "Caixa", href: "/financeiro/caixa", icon: ArrowLeftRight, perm: "fin.caixa" },
      { label: "Contas a Pagar", href: "/financeiro/pagar", icon: Receipt, perm: "fin.contas_pagar" },
      { label: "Ponto de Equilíbrio", href: "/financeiro/ponto-equilibrio", icon: Target, perm: "fin.ponto_equilibrio" },
    ],
  },
  {
    title: "Custos",
    items: [
      { label: "Centro de Custos", href: "/centro-custos", icon: Building2, perm: "fin.centro_custos" },
      { label: "Hora-Homem", href: "/hora-homem", icon: Clock, perm: "fin.ver_custos" },
      { label: "Hora-Máquina", href: "/hora-maquina", icon: Cog, perm: "fin.ver_custos" },
      { label: "Depreciação", href: "/depreciacao", icon: TrendingDown, perm: "fin.ver_custos" },
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
