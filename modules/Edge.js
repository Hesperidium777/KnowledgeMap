export class Edge {
    constructor(id, fromNode, toNode, label = '', type = 'solid') {
        this.id = id;
        this.fromNode = fromNode;
        this.toNode = toNode;
        this.label = label;
        this.type = type;
        this.color = '#6c757d';
        this.selected = false;
        this.arrowSize = 10;
    }

    draw(ctx) {
        ctx.save();
        
        // Настройка стиля линии
        ctx.strokeStyle = this.selected ? '#ff9800' : this.color;
        ctx.lineWidth = this.selected ? 3 : 2;
        
        if (this.type === 'dashed') {
            ctx.setLineDash([5, 5]);
        } else if (this.type === 'dotted') {
            ctx.setLineDash([2, 2]);
        }

        // Вычисляем точки соединения (границы узлов)
        const startPoint = this.getConnectionPoint(this.fromNode, this.toNode);
        const endPoint = this.getConnectionPoint(this.toNode, this.fromNode);

        // Рисуем линию
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        // Рисуем стрелку
        this.drawArrow(ctx, startPoint, endPoint);

        // Рисуем метку
        if (this.label) {
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(midX - 30, midY - 10, 60, 20);
            
            ctx.fillStyle = '#333333';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, midX, midY);
        }

        ctx.restore();
    }

    getConnectionPoint(node, otherNode) {
        const dx = otherNode.x - node.x;
        const dy = otherNode.y - node.y;
        const angle = Math.atan2(dy, dx);
        
        // Находим точку пересечения с прямоугольником
        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;
        
        // Проверяем пересечение с каждой стороной
        const intersections = [];
        
        // Верхняя сторона
        if (dx !== 0) {
            const y = node.y - halfHeight;
            const x = node.x + (y - node.y) * dx / dy;
            if (Math.abs(x - node.x) <= halfWidth) {
                intersections.push({x, y});
            }
        }
        
        // Нижняя сторона
        if (dx !== 0) {
            const y = node.y + halfHeight;
            const x = node.x + (y - node.y) * dx / dy;
            if (Math.abs(x - node.x) <= halfWidth) {
                intersections.push({x, y});
            }
        }
        
        // Левая сторона
        if (dy !== 0) {
            const x = node.x - halfWidth;
            const y = node.y + (x - node.x) * dy / dx;
            if (Math.abs(y - node.y) <= halfHeight) {
                intersections.push({x, y});
            }
        }
        
        // Правая сторона
        if (dy !== 0) {
            const x = node.x + halfWidth;
            const y = node.y + (x - node.x) * dy / dx;
            if (Math.abs(y - node.y) <= halfHeight) {
                intersections.push({x, y});
            }
        }
        
        // Выбираем точку, ближайшую к другому узлу
        let closestPoint = intersections[0];
        let minDistance = Infinity;
        
        for (const point of intersections) {
            const distance = Math.sqrt(
                Math.pow(point.x - otherNode.x, 2) + 
                Math.pow(point.y - otherNode.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }
        
        return closestPoint || {x: node.x, y: node.y};
    }

    drawArrow(ctx, startPoint, endPoint) {
        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
        
        ctx.save();
        ctx.fillStyle = this.selected ? '#ff9800' : this.color;
        
        ctx.translate(endPoint.x, endPoint.y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.arrowSize, -this.arrowSize / 2);
        ctx.lineTo(-this.arrowSize, this.arrowSize / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    containsPoint(x, y, ctx) {
        const startPoint = this.getConnectionPoint(this.fromNode, this.toNode);
        const endPoint = this.getConnectionPoint(this.toNode, this.fromNode);
        
        // Упрощенная проверка близости точки к линии
        const A = startPoint;
        const B = endPoint;
        const P = {x, y};
        
        const AB = {x: B.x - A.x, y: B.y - A.y};
        const AP = {x: P.x - A.x, y: P.y - A.y};
        
        const dot = AP.x * AB.x + AP.y * AB.y;
        const lengthSquared = AB.x * AB.x + AB.y * AB.y;
        
        let t = dot / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const projection = {
            x: A.x + t * AB.x,
            y: A.y + t * AB.y
        };
        
        const distance = Math.sqrt(
            Math.pow(P.x - projection.x, 2) + 
            Math.pow(P.y - projection.y, 2)
        );
        
        return distance < 8; // Пороговое расстояние для выбора
    }

    toJSON() {
        return {
            id: this.id,
            fromNodeId: this.fromNode.id,
            toNodeId: this.toNode.id,
            label: this.label,
            type: this.type,
            color: this.color
        };
    }

    static fromJSON(data, nodesMap) {
        const fromNode = nodesMap[data.fromNodeId];
        const toNode = nodesMap[data.toNodeId];
        
        if (!fromNode || !toNode) {
            return null;
        }
        
        const edge = new Edge(data.id, fromNode, toNode, data.label, data.type);
        edge.color = data.color || '#6c757d';
        return edge;
    }
}