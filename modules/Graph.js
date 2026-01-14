import { Node } from './Node.js';
import { Edge } from './Edge.js';

export class Graph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedElements = new Set();
        this.nextNodeId = 1;
        this.nextEdgeId = 1;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.scale = 1;
        this.isAddingEdge = false;
        this.edgeStartNode = null;
    }

    addNode(x, y, title = 'Новый узел') {
        const id = `node_${this.nextNodeId++}`;
        const node = new Node(id, x, y, title);
        this.nodes.push(node);
        return node;
    }

    addEdge(fromNode, toNode, label = '') {
        // Проверяем, существует ли уже такая связь
        const existingEdge = this.edges.find(edge => 
            (edge.fromNode === fromNode && edge.toNode === toNode) ||
            (edge.fromNode === toNode && edge.toNode === fromNode)
        );
        
        if (existingEdge || fromNode === toNode) {
            return null;
        }
        
        const id = `edge_${this.nextEdgeId++}`;
        const edge = new Edge(id, fromNode, toNode, label);
        this.edges.push(edge);
        
        // Обновляем связи в узлах
        fromNode.connections.push(toNode.id);
        toNode.connections.push(fromNode.id);
        
        return edge;
    }

    removeNode(node) {
        // Удаляем связанные ребра
        this.edges = this.edges.filter(edge => 
            edge.fromNode !== node && edge.toNode !== node
        );
        
        // Удаляем ссылки на узел в других узлах
        this.nodes.forEach(n => {
            const index = n.connections.indexOf(node.id);
            if (index > -1) {
                n.connections.splice(index, 1);
            }
        });
        
        // Удаляем сам узел
        const index = this.nodes.indexOf(node);
        if (index > -1) {
            this.nodes.splice(index, 1);
        }
        
        this.selectedElements.delete(node);
    }

    removeEdge(edge) {
        // Удаляем ссылки на связь в узлах
        const fromIndex = edge.fromNode.connections.indexOf(edge.toNode.id);
        const toIndex = edge.toNode.connections.indexOf(edge.fromNode.id);
        
        if (fromIndex > -1) edge.fromNode.connections.splice(fromIndex, 1);
        if (toIndex > -1) edge.toNode.connections.splice(toIndex, 1);
        
        // Удаляем само ребро
        const index = this.edges.indexOf(edge);
        if (index > -1) {
            this.edges.splice(index, 1);
        }
        
        this.selectedElements.delete(edge);
    }

    getNodeAt(x, y) {
        // Ищем с конца, чтобы верхние узлы были приоритетнее
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            if (this.nodes[i].containsPoint(x, y)) {
                return this.nodes[i];
            }
        }
        return null;
    }

    getEdgeAt(x, y, ctx) {
        for (let i = this.edges.length - 1; i >= 0; i--) {
            if (this.edges[i].containsPoint(x, y, ctx)) {
                return this.edges[i];
            }
        }
        return null;
    }

    selectElement(element, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }
        
        element.selected = true;
        this.selectedElements.add(element);
    }

    clearSelection() {
        this.selectedElements.forEach(element => {
            element.selected = false;
        });
        this.selectedElements.clear();
    }

    deleteSelected() {
        const elementsToDelete = Array.from(this.selectedElements);
        elementsToDelete.forEach(element => {
            if (element instanceof Node) {
                this.removeNode(element);
            } else if (element instanceof Edge) {
                this.removeEdge(element);
            }
        });
        this.selectedElements.clear();
    }

    startDrag(x, y) {
        this.isDragging = true;
        this.dragStart = { x, y };
        
        // Если есть выделенные элементы, перетаскиваем их
        if (this.selectedElements.size > 0) {
            this.offset = { x: 0, y: 0 };
        }
    }

    drag(x, y) {
        if (!this.isDragging) return;
        
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        
        if (this.selectedElements.size > 0) {
            // Перетаскиваем выделенные элементы
            this.selectedElements.forEach(element => {
                if (element instanceof Node) {
                    element.move(dx - this.offset.x, dy - this.offset.y);
                }
            });
        } else {
            // Перетаскиваем весь канвас
            this.nodes.forEach(node => {
                node.move(dx - this.offset.x, dy - this.offset.y);
            });
        }
        
        this.offset = { x: dx, y: dy };
    }

    endDrag() {
        this.isDragging = false;
        this.offset = { x: 0, y: 0 };
    }

    autoLayout() {
        if (this.nodes.length === 0) return;
        
        // Простой force-directed layout
        const centerX = 400;
        const centerY = 300;
        const repulsion = 100;
        const attraction = 0.1;
        const iterations = 100;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Отталкивание между всеми узлами
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const node1 = this.nodes[i];
                    const node2 = this.nodes[j];
                    
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    const force = repulsion / (distance * distance);
                    
                    node1.x -= force * dx * 0.5;
                    node1.y -= force * dy * 0.5;
                    node2.x += force * dx * 0.5;
                    node2.y += force * dy * 0.5;
                }
            }
            
            // Притяжение между связанными узлами
            this.edges.forEach(edge => {
                const dx = edge.toNode.x - edge.fromNode.x;
                const dy = edge.toNode.y - edge.fromNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                edge.fromNode.x += dx * attraction;
                edge.fromNode.y += dy * attraction;
                edge.toNode.x -= dx * attraction;
                edge.toNode.y -= dy * attraction;
            });
            
            // Притяжение к центру
            this.nodes.forEach(node => {
                const dx = centerX - node.x;
                const dy = centerY - node.y;
                
                node.x += dx * 0.01;
                node.y += dy * 0.01;
            });
        }
    }

    getAllTags() {
        const tags = new Set();
        this.nodes.forEach(node => {
            node.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags);
    }

    getNodesByTag(tag) {
        return this.nodes.filter(node => node.tags.includes(tag));
    }

    toJSON() {
        return {
            nodes: this.nodes.map(node => node.toJSON()),
            edges: this.edges.map(edge => edge.toJSON()),
            nextNodeId: this.nextNodeId,
            nextEdgeId: this.nextEdgeId
        };
    }

    fromJSON(data) {
        this.nodes = [];
        this.edges = [];
        this.selectedElements.clear();
        
        // Создаем узлы
        const nodesMap = {};
        data.nodes.forEach(nodeData => {
            const node = Node.fromJSON(nodeData);
            nodesMap[node.id] = node;
            this.nodes.push(node);
        });
        
        // Создаем ребра
        data.edges.forEach(edgeData => {
            const edge = Edge.fromJSON(edgeData, nodesMap);
            if (edge) {
                this.edges.push(edge);
            }
        });
        
        this.nextNodeId = data.nextNodeId || this.nextNodeId;
        this.nextEdgeId = data.nextEdgeId || this.nextEdgeId;
    }
}