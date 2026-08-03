import {
  LayoutDashboard,
  Tag,
  HardHat,
  Factory,
  Calendar,
  AlertTriangle,
  Landmark,
  CreditCard,
  Wallet,
  Layers,
  Percent,
  FileText,
  Users,
  UserCog,
  Package,
  Tags,
  Truck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { filtrarNav } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: string;
  countKey?: "vendas" | "obras" | "receber" | "pagar";
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Menu conforme o CONTRATO V6 (grupos, ordem, nomes, ícones). Ver legacy/vidrogestor-congelado-v6.html (const NAV).
// V6 gateia por permissão apenas: contas-receber, contas-pagar, caixa, configuracoes.
export const navGroups: NavGroup[] = [
  {
    title: "Visão geral",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Comercial",
    items: [{ label: "Vendas", href: "/orcamentos", icon: Tag, countKey: "vendas" }],
  },
  {
    title: "Operação",
    items: [
      { label: "Produção", href: "/producao", icon: Factory, perm: "prod.ver" },
      { label: "Obras", href: "/obras", icon: HardHat, countKey: "obras" },
      { label: "Agenda", href: "/agenda", icon: Calendar },
      { label: "Reclamações", href: "/reclamacoes", icon: AlertTriangle },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { label: "Contas a receber", href: "/financeiro/receber", icon: Landmark, perm: "fin.contas_receber", countKey: "receber" },
      { label: "Contas a pagar", href: "/financeiro/pagar", icon: CreditCard, perm: "fin.contas_pagar", countKey: "pagar" },
      { label: "Caixa", href: "/financeiro/caixa", icon: Wallet, perm: "fin.caixa" },
      { label: "Centro de custos", href: "/centro-custos", icon: Layers },
      { label: "Ponto de equilíbrio", href: "/financeiro/ponto-equilibrio", icon: Percent },
      { label: "Análise por venda", href: "/analise", icon: FileText },
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
      { label: "Contas financeiras", href: "/contas", icon: Landmark },
      { label: "Operadoras", href: "/operadoras", icon: CreditCard },
    ],
  },
  {
    title: "Administração",
    items: [{ label: "Configurações", href: "/configuracoes", icon: Settings, perm: "adm.config" }],
  },
];

export function filterNav(groups: NavGroup[], perms: string[]): NavGroup[] {
  return filtrarNav(groups, perms) as NavGroup[];
}
