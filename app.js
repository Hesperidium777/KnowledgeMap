import { Graph } from './modules/Graph.js';
import { Storage } from './modules/Storage.js';
import { UI } from './modules/UI.js';

class KnowledgeMapApp {
    constructor() {
        this.graph = new Graph();
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = new UI(this.graph, this.canvas, this.ctx);
        
        this.init();
        this.load();
        this.animate();
    }

    init() {
        // Инициализация интерфейса
        this.initUI();
        
        // Добавляем обработчики событий
        this.initEventListeners();
        
        // Загружаем данные
        this.load();
        
        // Запускаем анимацию
        this.animate();
    }

    initUI() {
        // Делаем функции глобальными для доступа из модулей
        window.updateCursorPosition = this.updateCursorPosition.bind(this);
        window.openNodeEditor = this.openNodeEditor.bind(this);
        
        // Обновляем статистику
        this.updateStats();
        this.updateTags();
    }

    initEventListeners() {
        // Кнопка добавления узла
        document.getElementById('addNodeBtn').addEventListener('click', () => {
            const x = this.canvas.width / 2;
            const y = this.canvas.height / 2;
            const node = this.graph.addNode(x, y);
            this.graph.selectElement(node, false);
            this.openNodeEditor(node);
            this.ui.draw();
            this.updateStats();
        });

        // Кнопка добавления связи
        document.getElementById('addEdgeBtn').addEventListener('click', () => {
            this.graph.isAddingEdge = !this.graph.isAddingEdge;
            const btn = document.getElementById('addEdgeBtn');
            btn.classList.toggle('active', this.graph.isAddingEdge);
            btn.title = this.graph.isAddingEdge 
                ? 'Режим добавления связей (нажмите Shift + клик на узлах)' 
                : 'Добавить связь';
        });

        // Кнопка удаления
        document.getElementById('deleteBtn').addEventListener('click', () => {
            if (this.graph.selectedElements.size > 0) {
                if (confirm(`Удалить ${this.graph.selectedElements.size} элемент(ов)?`)) {
                    this.graph.deleteSelected();
                    this.ui.draw();
                    this.updateStats();
                    this.save();
                }
            }
        });

        // Авто-расположение
        document.getElementById('autoLayoutBtn').addEventListener('click', () => {
            this.graph.autoLayout();
            this.ui.draw();
        });

        // Сохранение
        document.getElementById('saveBtn').addEventListener('click', () => {
            if (this.save()) {
                this.showStatus('Сохранено успешно!', 'success');
            } else {
                this.showStatus('Ошибка при сохранении', 'error');
            }
        });

        // Экспорт
        document.getElementById('exportBtn').addEventListener('click', () => {
            if (Storage.exportToFile(this.graph)) {
                this.showStatus('Экспорт завершен', 'success');
            }
        });

        // Импорт
        document.getElementById('exportBtn').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.importData();
        });

        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchNodes(e.target.value);
        });

        // Смена темы
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Настройки
        document.getElementById('bgColor').addEventListener('input', (e) => {
            document.querySelector('.workspace').style.backgroundColor = e.target.value;
        });

        document.getElementById('nodeSize').addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.graph.nodes.forEach(node => {
                node.width = 100 * (size / 50);
                node.height = 60 * (size / 50);
            });
            this.ui.draw();
        });

        // Контекстное меню
        document.querySelectorAll('#contextMenu li').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleContextMenuAction(action);
            });
        });

        // Модальное окно редактора узла
        document.querySelector('.close-btn').addEventListener('click', () => {
            this.closeNodeEditor();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeNodeEditor();
        });

        document.getElementById('saveNodeBtn').addEventListener('click', () => {
            this.saveNode();
        });

        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            // Удаление
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.graph.selectedElements.size > 0) {
                    this.graph.deleteSelected();
                    this.ui.draw();
                    this.updateStats();
                    this.save();
                }
            }
            
            // Сохранение
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.save();
                this.showStatus('Сохранено', 'success');
            }
            
            // Отмена выделения
            if (e.key === 'Escape') {
                this.graph.clearSelection();
                this.ui.draw();
            }
            
            // Копирование
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                this.copySelected();
            }
        });

        // Автосохранение при изменении
        setInterval(() => {
            if (this.hasUnsavedChanges) {
                this.save();
                this.hasUnsavedChanges = false;
            }
        }, 30000); // Каждые 30 секунд
    }

    openNodeEditor(node) {
        this.editingNode = node;
        
        document.getElementById('nodeTitle').value = node.title;
        document.getElementById('nodeContent').value = node.content;
        document.getElementById('nodeColor').value = node.color;
        document.getElementById('nodeTags').value = node.tags.join(', ');
        
        document.getElementById('nodeModal').style.display = 'flex';
    }

    closeNodeEditor() {
        document.getElementById('nodeModal').style.display = 'none';
        this.editingNode = null;
    }

    saveNode() {
        if (!this.editingNode) return;
        
        this.editingNode.title = document.getElementById('nodeTitle').value || 'Без названия';
        this.editingNode.content = document.getElementById('nodeContent').value;
        this.editingNode.color = document.getElementById('nodeColor').value;
        
        const tagsInput = document.getElementById('nodeTags').value;
        this.editingNode.tags = tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        this.editingNode.updateSizeBasedOnContent();
        this.editingNode.metadata.modified = new Date().toISOString();
        
        this.closeNodeEditor();
        this.ui.draw();
        this.updateStats();
        this.updateTags();
        this.save();
    }

    handleContextMenuAction(action) {
        const selectedNode = Array.from(this.graph.selectedElements)
            .find(el => el instanceof Node);
        
        if (!selectedNode) return;
        
        switch (action) {
            case 'edit':
                this.openNodeEditor(selectedNode);
                break;
            case 'changeColor':
                const color = prompt('Введите цвет в формате #RRGGBB:', selectedNode.color);
                if (color && /^#[0-9A-F]{6}$/i.test(color)) {
                    selectedNode.color = color;
                    this.ui.draw();
                    this.save();
                }
                break;
            case 'addTag':
                const tag = prompt('Введите тег:');
                if (tag && tag.trim()) {
                    selectedNode.addTag(tag.trim());
                    this.ui.draw();
                    this.updateTags();
                    this.save();
                }
                break;
            case 'delete':
                this.graph.removeNode(selectedNode);
                this.ui.draw();
                this.updateStats();
                this.save();
                break;
        }
    }

    searchNodes(query) {
        if (!query.trim()) {
            // Сбрасываем поиск
            this.graph.nodes.forEach(node => node.selected = false);
            this.graph.selectedElements.clear();
        } else {
            this.graph.nodes.forEach(node => {
                const matches = node.title.toLowerCase().includes(query.toLowerCase()) ||
                               node.content.toLowerCase().includes(query.toLowerCase()) ||
                               node.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
                
                if (matches) {
                    this.graph.selectElement(node, true);
                }
            });
        }
        
        this.ui.draw();
        this.updateStats();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        localStorage.setItem('knowledge_map_theme', newTheme);
    }

    updateCursorPosition(x, y) {
        const cursorPos = document.getElementById('cursorPosition');
        if (cursorPos) {
            cursorPos.textContent = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
        }
    }

    updateStats() {
        if (this.ui && this.ui.updateStats) {
            this.ui.updateStats();
        }
    }

    updateTags() {
        const tagsContainer = document.getElementById('tagsContainer');
        if (!tagsContainer) return;
        
        const tags = this.graph.getAllTags();
        tagsContainer.innerHTML = '';
        
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            tagElement.title = `Нажмите для фильтрации по тегу "${tag}"`;
            
            tagElement.addEventListener('click', () => {
                this.filterByTag(tag);
            });
            
            tagsContainer.appendChild(tagElement);
        });
    }

    filterByTag(tag) {
        this.graph.nodes.forEach(node => {
            node.selected = node.tags.includes(tag);
        });
        
        this.ui.draw();
        this.updateStats();
        
        this.showStatus(`Показаны узлы с тегом "${tag}"`, 'info');
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;
        
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;
        
        setTimeout(() => {
            statusElement.textContent = 'Готов к работе';
            statusElement.className = '';
        }, 3000);
    }

    save() {
        this.hasUnsavedChanges = true;
        return Storage.save(this.graph);
    }

    load() {
        // Загружаем тему
        const savedTheme = localStorage.getItem('knowledge_map_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Загружаем данные графа
        const data = Storage.load();
        if (data) {
            this.graph.fromJSON(data);
            this.ui.draw();
            this.updateStats();
            this.updateTags();
            this.showStatus('Данные загружены', 'success');
        } else {
            // Создаем пример графа
            this.createSampleGraph();
        }
    }

    createSampleGraph() {
        // Создаем пример структуры
        const node1 = this.graph.addNode(200, 200, 'JavaScript');
        node1.content = 'Main programming language for web development';
        node1.color = '#f0db4f';
        node1.addTag('programming');
        node1.addTag('web');
        
        const node2 = this.graph.addNode(400, 200, 'React');
        node2.content = 'Library for building user interfaces';
        node2.color = '#61dafb';
        node2.addTag('framework');
        node2.addTag('web');
        
        const node3 = this.graph.addNode(200, 400, 'Node.js');
        node3.content = 'JavaScript runtime built on Chrome\'s V8 JavaScript engine';
        node3.color = '#68a063';
        node3.addTag('server');
        node3.addTag('programming');
        
        const node4 = this.graph.addNode(400, 400, 'This is a Pet Project');
        node4.content = 'A project to showcase skills in web development';
        node4.color = '#4a6fa5';
        node4.addTag('learning');
        node4.addTag('portfolio');
        
        // Добавляем связи
        this.graph.addEdge(node1, node2, 'that is using');
        this.graph.addEdge(node1, node3, 'that is based on');
        this.graph.addEdge(node2, node4, 'that is using');
        this.graph.addEdge(node3, node4, 'that is using');
        
        this.ui.draw();
        this.updateStats();
        this.updateTags();
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const data = await Storage.importFromFile(file);
                
                if (confirm('Заменить текущие данные? (Текущие данные будут потеряны)')) {
                    this.graph.fromJSON(data);
                    this.ui.draw();
                    this.updateStats();
                    this.updateTags();
                    this.save();
                    
                    this.showStatus('Данные импортированы', 'success');
                }
            } catch (error) {
                alert(`Ошибка импорта: ${error.message}`);
            }
        };
        
        input.click();
    }

    copySelected() {
        const selectedNodes = Array.from(this.graph.selectedElements)
            .filter(el => el instanceof Node);
        
        if (selectedNodes.length === 0) return;
        
        const clipboardData = selectedNodes.map(node => ({
            title: node.title,
            content: node.content,
            tags: node.tags
        }));
        
        navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2))
            .then(() => {
                this.showStatus('Скопировано в буфер обмена', 'success');
            })
            .catch(err => {
                console.error('Ошибка копирования:', err);
            });
    }

    animate() {
        this.ui.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KnowledgeMapApp();
});