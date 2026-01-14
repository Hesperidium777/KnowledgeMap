export class Storage {
    static STORAGE_KEY = 'knowledge_map_data';
    static BACKUP_KEY = 'knowledge_map_backup';

    static save(graph) {
        try {
            const data = graph.toJSON();
            const jsonString = JSON.stringify(data, null, 2);
            localStorage.setItem(this.STORAGE_KEY, jsonString);
            
            // Создаем резервную копию
            this.createBackup(data);
            
            return true;
        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            return false;
        }
    }

    static load() {
        try {
            const jsonString = localStorage.getItem(this.STORAGE_KEY);
            if (!jsonString) return null;
            
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Ошибка при загрузке:', error);
            return null;
        }
    }

    static createBackup(data) {
        try {
            const backups = this.getBackups();
            backups.push({
                timestamp: new Date().toISOString(),
                data: data
            });
            
            // Храним только 5 последних резервных копий
            if (backups.length > 5) {
                backups.shift();
            }
            
            localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
        } catch (error) {
            console.error('Ошибка при создании резервной копии:', error);
        }
    }

    static getBackups() {
        try {
            const jsonString = localStorage.getItem(this.BACKUP_KEY);
            return jsonString ? JSON.parse(jsonString) : [];
        } catch (error) {
            console.error('Ошибка при получении резервных копий:', error);
            return [];
        }
    }

    static exportToFile(graph) {
        try {
            const data = graph.toJSON();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge_map_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            return false;
        }
    }

    static importFromFile(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('Неверный формат файла'));
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Ошибка при чтении файла'));
                };
                
                reader.readAsText(file);
            } catch (error) {
                reject(error);
            }
        });
    }

    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    static getStats() {
        const data = this.load();
        if (!data) return null;
        
        return {
            nodeCount: data.nodes ? data.nodes.length : 0,
            edgeCount: data.edges ? data.edges.length : 0,
            lastModified: data.nodes && data.nodes.length > 0 
                ? new Date(data.nodes[0].metadata?.modified || Date.now()).toLocaleString()
                : 'Никогда'
        };
    }
}