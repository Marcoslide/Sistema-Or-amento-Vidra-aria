import {
  LayoutDashboard,
  Tag,
  HardHat,
  Factory,
  Calendar,
  AlertTriangle,
  Landmark,
  Receipt,
  ArrowLeftRight,
  Layers,
  Percent,
  BarChart3,
  FolderTree,
  Users,
  UserCog,
  Package,
  Tags,
  Truck,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { filtrarNav } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Menu conforme o CONTRATO V6 (grupos, ordem e nomes). Guards de permissão mantidos por baixo.
export const navGroups: NavGroup[] = [
  {
    title: "Visão geral",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Comercial",
    items: [{ label: "Vendas", href: "/orcamentos", icon: Tag }],
  },
  {
    title: "Operação",
    items: [
      { label: "Produção", href: "/producao", icon: Factory, perm: "prod.ver" },
      { label: "Obras", href: "/obras", icon: HardHat, perm: "obras.ver" },
      { label: "Agenda", href: "/agenda", icon: Calendar },
      { label: "Reclamações", href: "/reclamacoes", icon: AlertTriangle },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { label: "Contas a receber", href: "/financeiro/receber", icon: Landmark, perm: "fin.contas_receber" },
      { label: "Contas a pagar", href: "/financeiro/pagar", icon: Receipt, perm: "fin.contas_pagar" },
      { label: "Caixa", href: "/financeiro/caixa", icon: ArrowLeftRight, perm: "fin.caixa" },
      { label: "Centro de custos", href: "/centro-custos", icon: Layers, perm: "fin.centro_custos" },
      { label: "Ponto de equilíbrio", href: "/financeiro/ponto-equilibrio", icon: Percent, perm: "fin.ponto_equilibrio" },
      { label: "Análise por venda", href: "/analise", icon: BarChart3, perm: "fin.ver_margem" },
      { label: "Categorias", href: "/categorias-financeiras", icon: FolderTree, perm: "fin.contas_pagar" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Vendedores", href: "/vendedores", icon: UserCog },
      { label: "Produtos", href: "/produtos", icon: Package },
      { label: "Famílias", href: "/familias", icon: Tags },
      { label: "Fornecedores", href: "/fornecedores", icon: Truck },
      { label: "Operadoras", href: "/operadoras", icon: CreditCard },
    ],
  },
];

export function filterNav(groups: NavGroup[], perms: string[]): NavGroup[] {
  return filtrarNav(groups, perms) as NavGroup[];
}
