import Link from "next/link";
import {
  Store, CreditCard, Landmark, Layers, Users, UserCog, Package, Tags, Truck,
  Clock, Cog, TrendingDown, ChevronRight,
} from "lucide-react";

// Configurações = hub de cadastros administrativos (páginas reais com CRUD + exclusão segura).
// Substitui o antigo formulário mockado; cada item abre o cadastro funcional correspondente.
type Item = { href: string; label: string; desc: string; icon: React.ElementType };
type Grupo = { titulo: string; itens: Item[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Estrutura da empresa",
    itens: [
      { href: "/lojas", label: "Lojas / operações", desc: "Unidades, dados fiscais e responsáveis.", icon: Store },
      { href: "/usuarios", label: "Usuários", desc: "Equipe com acesso ao sistema.", icon: Users },
      { href: "/perfis", label: "Perfis de acesso", desc: "Permissões por função.", icon: UserCog },
    ],
  },
  {
    titulo: "Comercial",
    itens: [
      { href: "/clientes", label: "Clientes", desc: "Cadastro de clientes.", icon: Users },
      { href: "/vendedores", label: "Vendedores", desc: "Equipe comercial.", icon: UserCog },
      { href: "/produtos", label: "Produtos", desc: "Itens, preços e regras de cálculo.", icon: Package },
      { href: "/familias", label: "Famílias", desc: "Agrupamento de produtos (inclui Moldura).", icon: Tags },
      { href: "/fornecedores", label: "Fornecedores", desc: "Cadastro de fornecedores.", icon: Truck },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { href: "/contas", label: "Contas financeiras", desc: "Caixas e contas bancárias.", icon: Landmark },
      { href: "/operadoras", label: "Operadoras de cartão", desc: "Taxas e prazos de recebimento.", icon: CreditCard },
      { href: "/centro-custos", label: "Centro de custos", desc: "Custos fixos e variáveis.", icon: Layers },
      { href: "/hora-homem", label: "Hora-homem", desc: "Custo de mão de obra.", icon: Clock },
      { href: "/hora-maquina", label: "Hora-máquina", desc: "Custo de equipamentos.", icon: Cog },
      { href: "/depreciacao", label: "Depreciação", desc: "Depreciação de ativos.", icon: TrendingDown },
    ],
  },
];

export default function ConfiguracoesPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="v6-page-title">Configurações</div>
        <div className="v6-page-desc">Cadastros administrativos e parâmetros do sistema. Cada item abre o cadastro completo, com exclusão segura.</div>
      </div>

      {GRUPOS.map((g) => (
        <div key={g.titulo} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v6-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>{g.titulo}</div>
          <div className="v6-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
            {g.itens.map((it) => {
              const Icon = it.icon;
              return (
                <Link key={it.href} href={it.href} className="v6-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, textDecoration: "none", color: "inherit" }}>
                  <div className="v6-ic"><Icon size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{it.label}</div>
                    <div style={{ fontSize: 12.5, color: "var(--v6-muted)" }}>{it.desc}</div>
                  </div>
                  <ChevronRight size={18} style={{ color: "var(--v6-muted)" }} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
