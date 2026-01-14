export class Node {
    constructor(id, x, y, title = 'Новый узел', content = '', color = '#4a6fa5') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.title = title;
        this.content = content;
        this.color = color;
        this.width = 100;
        this.height = 60;
        this.radius = 8;
        this.selected = false;
        this.tags = [];
        this.connections = []; // IDs связанных узлов
        this.metadata = {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: 1
        };
    }

    draw(ctx) {
        // Рисуем закругленный прямоугольник
        ctx.save();
        
        // Тень для выделенного узла
        if (this.selected) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Основной прямоугольник
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height,
            this.radius
        );
        ctx.fill();

        // Обводка для выделенного узла
        if (this.selected) {
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Сбрасываем тень
        ctx.shadowColor = 'transparent';

        // Текст заголовка
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Обрезаем текст, если слишком длинный
        const maxWidth = this.width - 20;
        let displayTitle = this.title;
        if (ctx.measureText(displayTitle).width > maxWidth) {
            while (ctx.measureText(displayTitle + '...').width > maxWidth && displayTitle.length > 0) {
                displayTitle = displayTitle.slice(0, -1);
            }
            displayTitle += '...';
        }
        
        ctx.fillText(displayTitle, this.x, this.y);

        // Индикатор тегов
        if (this.tags.length > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '10px Inter';
            const tagText = `🏷️ ${this.tags.length}`;
            const tagWidth = ctx.measureText(tagText).width;
            ctx.fillText(tagText, this.x + this.width/2 - tagWidth/2 - 5, this.y - this.height/2 + 12);
        }

        // Индикатор контента
        if (this.content) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '10px Inter';
            ctx.fillText('📝', this.x - this.width/2 + 12, this.y - this.height/2 + 12);
        }

        ctx.restore();
    }

    containsPoint(x, y) {
        return x >= this.x - this.width / 2 &&
               x <= this.x + this.width / 2 &&
               y >= this.y - this.height / 2 &&
               y <= this.y + this.height / 2;
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        this.metadata.modified = new Date().toISOString();
    }

    updateSizeBasedOnContent() {
        const lineCount = Math.max(1, this.content.split('\n').length);
        this.height = 60 + (lineCount - 1) * 20;
    }

    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.metadata.modified = new Date().toISOString();
        }
    }

    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.metadata.modified = new Date().toISOString();
        }
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            title: this.title,
            content: this.content,
            color: this.color,
            tags: this.tags,
            connections: this.connections,
            metadata: this.metadata
        };
    }

    static fromJSON(data) {
        const node = new Node(data.id, data.x, data.y, data.title, data.content, data.color);
        node.tags = data.tags || [];
        node.connections = data.connections || [];
        node.metadata = data.metadata || {};
        return node;
    }
}