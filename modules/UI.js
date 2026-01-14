export class UI {
    constructor(graph, canvas, context) {
        this.graph = graph;
        this.canvas = canvas;
        this.ctx = context;
        this.mouse = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.selectedNode = null;
        this.tempEdge = null;
        
        this.initEventListeners();
        this.setupCanvas();
    }

    setupCanvas() {
        // Устанавливаем размер канваса
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Рисуем сетку на фоне
        this.drawGrid();
    }

    drawGrid() {
        const gridSize = 50;
        const offsetX = 0;
        const offsetY = 0;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Вертикальные линии
        for (let x = offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    initEventListeners() {
        // События мыши
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Изменение размера окна
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.draw();
        });
    }

    handleMouseDown(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
        
        if (event.button === 0) { // Левая кнопка мыши
            const node = this.graph.getNodeAt(this.mouse.x, this.mouse.y);
            const edge = this.graph.getEdgeAt(this.mouse.x, this.mouse.y, this.ctx);
            
            if (node) {
                if (event.ctrlKey || event.metaKey) {
                    // Добавляем/удаляем из выделения с Ctrl
                    if (node.selected) {
                        node.selected = false;
                        this.graph.selectedElements.delete(node);
                    } else {
                        this.graph.selectElement(node, true);
                    }
                } else if (event.shiftKey && this.graph.isAddingEdge) {
                    // Начинаем создание связи
                    this.graph.edgeStartNode = node;
                    this.tempEdge = { fromNode: node, toX: this.mouse.x, toY: this.mouse.y };
                } else {
                    // Выделяем узел и начинаем перетаскивание
                    if (!node.selected) {
                        this.graph.selectElement(node, false);
                    }
                    this.graph.startDrag(this.mouse.x, this.mouse.y);
                }
            } else if (edge) {
                // Выделяем связь
                if (event.ctrlKey || event.metaKey) {
                    if (edge.selected) {
                        edge.selected = false;
                        this.graph.selectedElements.delete(edge);
                    } else {
                        this.graph.selectElement(edge, true);
                    }
                } else {
                    this.graph.selectElement(edge, false);
                }
            } else {
                // Начинаем панорамирование
                this.isPanning = true;
                this.panStart = { x: this.mouse.x, y: this.mouse.y };
                this.canvas.style.cursor = 'grabbing';
            }
        } else if (event.button === 2) { // Правая кнопка мыши
            // Показываем контекстное меню
            this.showContextMenu(event);
        }
        
        this.draw();
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
        
        // Обновляем позицию курсора в статус баре
        if (window.updateCursorPosition) {
            window.updateCursorPosition(this.mouse.x, this.mouse.y);
        }
        
        if (this.graph.isDragging) {
            // Продолжаем перетаскивание
            this.graph.drag(this.mouse.x, this.mouse.y);
            this.draw();
        } else if (this.isPanning) {
            // Панорамирование
            const dx = this.mouse.x - this.panStart.x;
            const dy = this.mouse.y - this.panStart.y;
            
            this.panStart = { x: this.mouse.x, y: this.mouse.y };
            
            this.graph.nodes.forEach(node => {
                node.x += dx;
                node.y += dy;
            });
            
            this.draw();
        } else if (this.tempEdge) {
            // Обновляем временную связь
            this.tempEdge.toX = this.mouse.x;
            this.tempEdge.toY = this.mouse.y;
            this.draw();
        } else {
            // Изменяем курсор при наведении
            const node = this.graph.getNodeAt(this.mouse.x, this.mouse.y);
            const edge = this.graph.getEdgeAt(this.mouse.x, this.mouse.y, this.ctx);
            
            if (node || edge) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'grab';
            }
        }
    }

    handleMouseUp(event) {
        if (event.button === 0) { // Левая кнопка мыши
            if (this.graph.isDragging) {
                this.graph.endDrag();
            }
            
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = 'grab';
            }
            
            if (this.tempEdge && this.graph.edgeStartNode) {
                const node = this.graph.getNodeAt(this.mouse.x, this.mouse.y);
                if (node && node !== this.graph.edgeStartNode) {
                    this.graph.addEdge(this.graph.edgeStartNode, node);
                    this.graph.edgeStartNode = null;
                }
                this.tempEdge = null;
                this.draw();
            }
        }
    }

    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const zoomIntensity = 0.1;
        const wheel = event.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        
        // Масштабируем относительно положения мыши
        this.graph.nodes.forEach(node => {
            node.x = mouseX + (node.x - mouseX) * zoom;
            node.y = mouseY + (node.y - mouseY) * zoom;
        });
        
        this.draw();
    }

    handleDoubleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const node = this.graph.getNodeAt(x, y);
        if (node) {
            // Открываем редактор узла
            if (window.openNodeEditor) {
                window.openNodeEditor(node);
            }
        } else {
            // Создаем новый узел
            const newNode = this.graph.addNode(x, y);
            this.graph.selectElement(newNode, false);
            
            if (window.openNodeEditor) {
                window.openNodeEditor(newNode);
            }
        }
        
        this.draw();
    }

    handleContextMenu(event) {
        event.preventDefault();
        this.showContextMenu(event);
    }

    showContextMenu(event) {
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;
        
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.display = 'block';
        
        // Закрываем меню при клике в другом месте
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    draw() {
        // Очищаем канвас
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем сетку
        this.drawGrid();
        
        // Рисуем ребра
        this.graph.edges.forEach(edge => edge.draw(this.ctx));
        
        // Рисуем временную связь
        if (this.tempEdge) {
            this.ctx.save();
            this.ctx.strokeStyle = '#6c757d';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            
            const startPoint = this.tempEdge.fromNode.getConnectionPoint
                ? this.tempEdge.fromNode.getConnectionPoint(
                    this.tempEdge.fromNode,
                    { x: this.tempEdge.toX, y: this.tempEdge.toY }
                )
                : { x: this.tempEdge.fromNode.x, y: this.tempEdge.fromNode.y };
            
            this.ctx.beginPath();
            this.ctx.moveTo(startPoint.x, startPoint.y);
            this.ctx.lineTo(this.tempEdge.toX, this.tempEdge.toY);
            this.ctx.stroke();
            
            // Рисуем временную стрелку
            const angle = Math.atan2(
                this.tempEdge.toY - startPoint.y,
                this.tempEdge.toX - startPoint.x
            );
            
            this.ctx.translate(this.tempEdge.toX, this.tempEdge.toY);
            this.ctx.rotate(angle);
            this.ctx.fillStyle = '#6c757d';
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(-10, -5);
            this.ctx.lineTo(-10, 5);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        // Рисуем узлы
        this.graph.nodes.forEach(node => node.draw(this.ctx));
    }

    updateStats() {
        const nodeCount = document.getElementById('nodeCount');
        const edgeCount = document.getElementById('edgeCount');
        const selectedCount = document.getElementById('selectedCount');
        
        if (nodeCount) nodeCount.textContent = this.graph.nodes.length;
        if (edgeCount) edgeCount.textContent = this.graph.edges.length;
        if (selectedCount) selectedCount.textContent = this.graph.selectedElements.size;
    }
}