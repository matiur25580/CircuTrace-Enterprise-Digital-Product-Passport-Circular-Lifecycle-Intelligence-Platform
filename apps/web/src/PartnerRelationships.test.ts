import { describe, expect, it } from 'vitest';
import { buildPartnerNetworkLayout } from './PartnerRelationships';
import type { Partner, PartnerRelationship } from './lib/api';

const partner = (id: string, name: string): Partner => ({
  _id: id, organizationId: 'org-1', name, type: 'supplier', status: 'active', createdAt: '', updatedAt: '',
});
const relationship = (id: string, source: string, target: string): PartnerRelationship => ({
  _id: id,
  sourcePartnerId: { _id: source, name: source === 'a' ? 'Alpha' : 'Beta', type: 'supplier', status: 'active' },
  targetPartnerId: { _id: target, name: target === 'b' ? 'Beta' : 'Gamma', type: 'manufacturer', status: 'active' },
  type: 'supplies_to', status: 'active', createdAt: '', updatedAt: '',
});

describe('partner network layout', () => {
  it('builds a directed graph from organization partner records and relationship endpoints', () => {
    const graph = buildPartnerNetworkLayout([partner('a', 'Alpha'), partner('b', 'Beta')], [relationship('r1', 'a', 'b')]);
    expect(graph.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(graph.edges).toEqual([{ id: 'r1', source: 'a', target: 'b', type: 'supplies_to', status: 'active' }]);
    expect(graph.nodes.every((node) => node.x >= 0 && node.x <= 800 && node.y >= 0 && node.y <= 430)).toBe(true);
  });
  it('keeps the graph bounded and reports when more than 18 partners exist', () => {
    const partners = Array.from({ length: 20 }, (_, index) => partner(String(index), 'Partner ' + index));
    const graph = buildPartnerNetworkLayout(partners, []);
    expect(graph.nodes).toHaveLength(18);
    expect(graph.truncated).toBe(true);
  });
  it('includes relationship endpoints even when the current directory filter omits them', () => {
    const graph = buildPartnerNetworkLayout([], [relationship('r1', 'a', 'b')]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });
});
