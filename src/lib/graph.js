// Deterministic force-directed layout plus descriptive graph metrics.
// Every value here is computed from stored synthetic relationship records.

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function computeLayout(nodes, edges, seed = 7, width = 760, height = 520) {
  const rand = seededRandom(seed);
  const positions = new Map();
  const n = nodes.length || 1;
  nodes.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.33;
    positions.set(node.id, {
      x: width / 2 + Math.cos(angle) * radius + (rand() - 0.5) * 30,
      y: height / 2 + Math.sin(angle) * radius + (rand() - 0.5) * 30
    });
  });

  const links = edges
    .filter((e) => positions.has(e.source) && positions.has(e.target))
    .map((e) => ({ s: e.source, t: e.target }));

  for (let iter = 0; iter < 320; iter += 1) {
    const cooling = 1 - iter / 320;
    const force = new Map();
    nodes.forEach((node) => force.set(node.id, { x: 0, y: 0 }));

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = positions.get(nodes[i].id);
        const b = positions.get(nodes[j].id);
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const repulsion = 5200 / (dist * dist);
        dx /= dist;
        dy /= dist;
        force.get(nodes[i].id).x += dx * repulsion;
        force.get(nodes[i].id).y += dy * repulsion;
        force.get(nodes[j].id).x -= dx * repulsion;
        force.get(nodes[j].id).y -= dy * repulsion;
      }
    }

    links.forEach(({ s, t }) => {
      const a = positions.get(s);
      const b = positions.get(t);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const spring = (dist - 120) * 0.012;
      force.get(s).x += (dx / dist) * spring;
      force.get(s).y += (dy / dist) * spring;
      force.get(t).x -= (dx / dist) * spring;
      force.get(t).y -= (dy / dist) * spring;
    });

    nodes.forEach((node) => {
      const p = positions.get(node.id);
      const f = force.get(node.id);
      f.x += (width / 2 - p.x) * 0.0025;
      f.y += (height / 2 - p.y) * 0.0025;
      p.x += f.x * cooling;
      p.y += f.y * cooling;
      p.x = Math.max(42, Math.min(width - 42, p.x));
      p.y = Math.max(38, Math.min(height - 38, p.y));
    });
  }

  return positions;
}

export function buildAdjacency(edges) {
  const adj = new Map();
  const add = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  edges.forEach((e) => {
    add(e.source, e.target);
    add(e.target, e.source);
  });
  return adj;
}

export function computeMetrics(nodes, edges) {
  const adjacency = buildAdjacency(edges);
  const n = nodes.length;
  const degree = new Map(nodes.map((node) => [node.id, (adjacency.get(node.id) || new Set()).size]));
  const maxDegree = n > 1 ? n - 1 : 1;

  // Brandes betweenness centrality (unweighted, undirected)
  const betweenness = new Map(nodes.map((node) => [node.id, 0]));
  nodes.forEach((source) => {
    const stack = [];
    const preds = new Map(nodes.map((node) => [node.id, []]));
    const sigma = new Map(nodes.map((node) => [node.id, 0]));
    const dist = new Map(nodes.map((node) => [node.id, -1]));
    sigma.set(source.id, 1);
    dist.set(source.id, 0);
    const queue = [source.id];
    while (queue.length) {
      const v = queue.shift();
      stack.push(v);
      (adjacency.get(v) || new Set()).forEach((w) => {
        if (dist.get(w) < 0) {
          dist.set(w, dist.get(v) + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          preds.get(w).push(v);
        }
      });
    }
    const delta = new Map(nodes.map((node) => [node.id, 0]));
    while (stack.length) {
      const w = stack.pop();
      preds.get(w).forEach((v) => {
        const contribution = (sigma.get(v) / (sigma.get(w) || 1)) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + contribution);
      });
      if (w !== source.id) betweenness.set(w, betweenness.get(w) + delta.get(w));
    }
  });
  if (n > 2) {
    const scale = 2 / ((n - 1) * (n - 2));
    betweenness.forEach((value, key) => betweenness.set(key, value * scale));
  }

  // Closeness centrality via BFS per node
  const closeness = new Map();
  nodes.forEach((node) => {
    const dist = new Map([[node.id, 0]]);
    const queue = [node.id];
    while (queue.length) {
      const v = queue.shift();
      (adjacency.get(v) || new Set()).forEach((w) => {
        if (!dist.has(w)) {
          dist.set(w, dist.get(v) + 1);
          queue.push(w);
        }
      });
    }
    const reachable = dist.size - 1;
    if (!reachable) {
      closeness.set(node.id, 0);
      return;
    }
    let total = 0;
    dist.forEach((d) => { total += d; });
    closeness.set(node.id, (reachable / total) * (reachable / (n - 1)));
  });

  // Connected components
  const seen = new Set();
  const components = [];
  nodes.forEach((node) => {
    if (seen.has(node.id)) return;
    const comp = [];
    const queue = [node.id];
    seen.add(node.id);
    while (queue.length) {
      const v = queue.shift();
      comp.push(v);
      (adjacency.get(v) || new Set()).forEach((w) => {
        if (!seen.has(w)) {
          seen.add(w);
          queue.push(w);
        }
      });
    }
    components.push(comp);
  });

  // Label propagation communities
  const label = new Map(nodes.map((node) => [node.id, node.id]));
  for (let iter = 0; iter < 12; iter += 1) {
    let changed = false;
    nodes.forEach((node) => {
      const counts = new Map();
      (adjacency.get(node.id) || new Set()).forEach((w) => {
        const l = label.get(w);
        counts.set(l, (counts.get(l) || 0) + 1);
      });
      if (!counts.size) return;
      let best = label.get(node.id);
      let bestCount = counts.get(best) || 0;
      counts.forEach((count, l) => {
        if (count > bestCount) {
          best = l;
          bestCount = count;
        }
      });
      if (best !== label.get(node.id)) {
        label.set(node.id, best);
        changed = true;
      }
    });
    if (!changed) break;
  }
  const communityIds = [...new Set(label.values())];
  const communityMap = new Map();
  communityIds.forEach((id, index) => communityMap.set(id, index + 1));
  const communities = new Map();
  label.forEach((l, nodeId) => communities.set(nodeId, communityMap.get(l)));

  const possible = (n * (n - 1)) / 2;
  const density = possible ? edges.length / possible : 0;

  return {
    degree,
    degreeCentrality: new Map(nodes.map((node) => [node.id, (degree.get(node.id) || 0) / maxDegree])),
    betweenness,
    closeness,
    components,
    communities,
    density,
    nodeCount: n,
    edgeCount: edges.length,
    averageDegree: n ? (edges.length * 2) / n : 0
  };
}

export function findPath(edges, startId, endId, maxDepth = 5) {
  if (!startId || !endId) return null;
  if (startId === endId) return [startId];
  const adjacency = new Map();
  edges.forEach((e) => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    if (!adjacency.has(e.target)) adjacency.set(e.target, []);
    adjacency.get(e.source).push({ next: e.target, edge: e });
    adjacency.get(e.target).push({ next: e.source, edge: e });
  });
  const visited = new Set([startId]);
  const queue = [{ node: startId, path: [startId], edges: [] }];
  while (queue.length) {
    const current = queue.shift();
    if (current.path.length - 1 >= maxDepth) continue;
    for (const step of adjacency.get(current.node) || []) {
      if (visited.has(step.next)) continue;
      const path = [...current.path, step.next];
      const pathEdges = [...current.edges, step.edge];
      if (step.next === endId) return { nodeIds: path, edges: pathEdges };
      visited.add(step.next);
      queue.push({ node: step.next, path, edges: pathEdges });
    }
  }
  return null;
}

export function directEdges(edges, id) {
  return edges.filter((e) => e.source === id || e.target === id);
}