/**
 * Domicílios & famílias (E22.2 — Vila viva). Os moradores deixam de ser avulsos:
 * são agrupados em **famílias** que dividem uma casa. A maioria dos lares é um
 * casal (um de cada gênero); alguns têm um terceiro (um filho); e sobra um ou
 * outro morador solteiro. Cada família tem um **lar** (âncora de moradia) para
 * onde volta à noite (casa a rotina do E22.1 à ideia de "cada um tem sua casa").
 *
 * Função pura e determinística: as mesmas entradas geram sempre as mesmas
 * famílias — testável e estável entre sessões.
 */

export type Gender = 'f' | 'm';
export type Role = 'adult' | 'child';

export interface Member { seed: number; x: number; z: number }
export interface Assignment {
  householdId: number;
  home: { x: number; z: number };
  gender: Gender;
  role: Role;
  size: number; // quantos moram nesse lar
}

/** Hash determinístico de uma semente numérica. */
function vary(seed: number, mod: number): number {
  let h = (seed ^ 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return h % mod;
}

/**
 * Agrupa moradores em famílias que dividem uma casa. Vizinhos (por ângulo ao
 * redor do centro) viram família; cada lar tem 1–3 pessoas. O 1º e o 2º de um
 * lar formam um casal (gêneros opostos); o 3º é um filho. O lar (âncora) é a
 * posição do primeiro membro. Devolve um Assignment alinhado ao índice de
 * `members`.
 */
export function assignHouseholds(members: Member[], homes?: { x: number; z: number }[]): Assignment[] {
  const n = members.length;
  const out: Assignment[] = new Array(n);
  if (n === 0) return out;
  // Ordena por ângulo — quem mora perto vira família.
  const order = members.map((_, i) => i)
    .sort((a, b) => Math.atan2(members[a].z, members[a].x) - Math.atan2(members[b].z, members[b].x));

  let hid = 0, i = 0;
  while (i < order.length) {
    const remaining = order.length - i;
    // Tamanho do lar: casal por padrão; às vezes trio (casal + filho); solteiro no resto.
    let size = 2; // casal por padrão
    if (remaining === 1) size = 1;
    else if (remaining >= 3 && vary(members[order[i]].seed, 4) === 0) size = 3; // ~1/4 tem um filho
    const group = order.slice(i, i + size);
    // Lar da família: uma casa dedicada (se houver lista) ou a posição do 1º membro.
    const home = homes && homes.length
      ? { ...homes[hid % homes.length] }
      : { x: members[group[0]].x, z: members[group[0]].z };
    group.forEach((mi, k) => {
      const gender: Gender = k === 0
        ? (vary(members[mi].seed, 2) ? 'm' : 'f')       // 1º: qualquer gênero
        : k === 1
          ? (out[group[0]].gender === 'm' ? 'f' : 'm')   // 2º: par do 1º (casal)
          : (vary(members[mi].seed, 2) ? 'm' : 'f');     // 3º (filho): qualquer
      const role: Role = k >= 2 ? 'child' : 'adult';
      out[mi] = { householdId: hid, home, gender, role, size };
    });
    hid++;
    i += size;
  }
  return out;
}
