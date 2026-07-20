/**
 * Repositório genérico em memória.
 *
 * Simula latência de rede e expõe uma API assíncrona idêntica à que
 * um cliente HTTP (fetch para o NestJS) exporá. Para integrar o backend,
 * basta criar uma implementação `HttpRepository<T>` com a mesma assinatura
 * e trocar a instância nos serviços — nenhuma tela muda.
 */
export interface Identifiable {
  id: string;
}

const LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryRepository<T extends Identifiable> {
  private items: T[];

  constructor(seed: T[]) {
    this.items = clone(seed);
  }

  async findAll(): Promise<T[]> {
    return delay(clone(this.items));
  }

  async findById(id: string): Promise<T | null> {
    const found = this.items.find((i) => i.id === id) ?? null;
    return delay(found ? clone(found) : null);
  }

  async create(item: T): Promise<T> {
    this.items = [clone(item), ...this.items];
    return delay(clone(item));
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return delay(null);
    this.items[idx] = { ...this.items[idx], ...patch };
    return delay(clone(this.items[idx]));
  }

  async remove(id: string): Promise<boolean> {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return delay(this.items.length < before);
  }
}
