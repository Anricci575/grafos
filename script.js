// Constantes de configuración
const GRAPH_CONFIG = {
    NODE_RADIUS: 20,
    NODE_COLOR: '#4285F4',
    NODE_SELECTED_COLOR: '#EA4335',
    EDGE_COLOR: '#5F6368',
    TEXT_COLOR: '#FFFFFF',
    K5_COLOR: '#EA4335',
    K33_COLOR: '#9C27B0',
    TEMP_EDGE_COLOR: 'rgba(95, 99, 104, 0.5)',
    CANVAS_BG: '#FFFFFF',
    NODE_TEXT_SIZE: '14px',
    STATUS_TEXT_SIZE: '16px'
};

// Clase Graph para manejar la estructura de datos del grafo
class Graph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.edgeStart = null;
        this.mode = 'select'; // 'select', 'add-node', 'add-edge'
    }

    addNode(x, y) {
        const newNode = {
            id: `n${this.nodes.length + 1}`,
            x,
            y,
            radius: GRAPH_CONFIG.NODE_RADIUS
        };
        this.nodes.push(newNode);
        return newNode;
    }

    addEdge(node1, node2, color) {
        // Verificar si la arista ya existe
        const edgeExists = this.edges.some(edge => 
            (edge.from === node1.id && edge.to === node2.id) || 
            (edge.from === node2.id && edge.to === node1.id));
        
        if (!edgeExists && node1.id !== node2.id) {
            this.edges.push({
                from: node1.id,
                to: node2.id,
                color: color || GRAPH_CONFIG.EDGE_COLOR
            });
            return true;
        }
        return false;
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.edgeStart = null;
        this.mode = 'select';
    }

    getNodeById(id) {
        return this.nodes.find(node => node.id === id);
    }

    getAdjacencyList() {
        const adjacency = {};
        
        // Inicializar lista de adyacencia
        this.nodes.forEach(node => {
            adjacency[node.id] = [];
        });
        
        // Llenar con conexiones
        this.edges.forEach(edge => {
            adjacency[edge.from].push(edge.to);
            adjacency[edge.to].push(edge.from);
        });
        
        return adjacency;
    }

    toJSON() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }

    fromJSON(json) {
        if (json && json.nodes && json.edges) {
            this.nodes = json.nodes.map(node => ({
                ...node,
                radius: GRAPH_CONFIG.NODE_RADIUS
            }));
            this.edges = json.edges;
            return true;
        }
        return false;
    }
}

// Clase GraphVisualizer para manejar la representación visual del grafo
class GraphVisualizer {
    constructor(canvas, graph) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.graph = graph;
        this.isDragging = false;
        this.tempEdgeEnd = null;
        
        // Ajustar canvas para pantallas de alta densidad
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * devicePixelRatio;
        this.canvas.height = rect.height * devicePixelRatio;
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        this.draw();
    }

    draw() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = GRAPH_CONFIG.CANVAS_BG;
        this.ctx.fillRect(0, 0, this.canvas.width / devicePixelRatio, this.canvas.height / devicePixelRatio);
        
        // Dibujar aristas
        this.drawEdges();
        
        // Dibujar nodos
        this.drawNodes();
        
        // Dibujar arista temporal si estamos en modo añadir arista
        this.drawTempEdge();
    }

    drawEdges() {
        this.graph.edges.forEach(edge => {
            const fromNode = this.graph.getNodeById(edge.from);
            const toNode = this.graph.getNodeById(edge.to);
            
            if (fromNode && toNode) {
                this.drawEdge(fromNode, toNode, edge.color || GRAPH_CONFIG.EDGE_COLOR);
            }
        });
    }

    drawEdge(fromNode, toNode, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(fromNode.x, fromNode.y);
        this.ctx.lineTo(toNode.x, toNode.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawNodes() {
        this.graph.nodes.forEach(node => {
            // Dibujar nodo
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = (node === this.graph.selectedNode || node === this.graph.edgeStart) ? 
                GRAPH_CONFIG.NODE_SELECTED_COLOR : GRAPH_CONFIG.NODE_COLOR;
            this.ctx.fill();
            this.ctx.strokeStyle = GRAPH_CONFIG.EDGE_COLOR;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Dibujar etiqueta del nodo
            this.ctx.fillStyle = GRAPH_CONFIG.TEXT_COLOR;
            this.ctx.font = GRAPH_CONFIG.NODE_TEXT_SIZE + ' Roboto';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.id, node.x, node.y);
        });
    }

    drawTempEdge() {
        if (this.graph.mode === 'add-edge' && this.graph.edgeStart && this.tempEdgeEnd) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.graph.edgeStart.x, this.graph.edgeStart.y);
            this.ctx.lineTo(this.tempEdgeEnd.x, this.tempEdgeEnd.y);
            this.ctx.strokeStyle = GRAPH_CONFIG.TEMP_EDGE_COLOR;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    getNodeAtPosition(x, y) {
        return this.graph.nodes.find(node => {
            const dx = node.x - x;
            const dy = node.y - y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = rect.width / this.canvas.width * devicePixelRatio;
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;
        
        const clickedNode = this.getNodeAtPosition(mouseX, mouseY);
        
        if (this.graph.mode === 'add-node') {
            this.graph.addNode(mouseX, mouseY);
            this.graph.mode = 'select';
            if (this.onGraphChange) this.onGraphChange();
        } else if (this.graph.mode === 'add-edge') {
            if (clickedNode) {
                if (!this.graph.edgeStart) {
                    this.graph.edgeStart = clickedNode;
                } else if (clickedNode !== this.graph.edgeStart) {
                    this.graph.addEdge(this.graph.edgeStart, clickedNode);
                    this.graph.edgeStart = null;
                    if (this.onGraphChange) this.onGraphChange();
                }
            }
        } else { // Modo selección
            this.graph.selectedNode = clickedNode;
            this.isDragging = !!clickedNode;
        }
        
        this.draw();
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = rect.width / this.canvas.width * devicePixelRatio;
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;
        
        if (this.isDragging && this.graph.selectedNode) {
            this.graph.selectedNode.x = mouseX;
            this.graph.selectedNode.y = mouseY;
            if (this.onGraphChange) this.onGraphChange();
            this.draw();
        } else if (this.graph.mode === 'add-edge' && this.graph.edgeStart) {
            this.tempEdgeEnd = { x: mouseX, y: mouseY };
            this.draw();
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.graph.selectedNode = null;
    }

    handleTouchStart(event) {
        event.preventDefault();
        this.handleMouseDown(event.touches[0]);
    }

    handleTouchMove(event) {
        event.preventDefault();
        this.handleMouseMove(event.touches[0]);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handleMouseUp();
    }
}

// Clase PlanarityChecker para verificar la planaridad del grafo
class PlanarityChecker {
    static check(graph) {
        const v = graph.nodes.length;
        const e = graph.edges.length;
        
        if (v === 0) return { planar: null, message: 'Grafo vacío' };
        if (v === 1) return { planar: true, message: 'Grafo trivial (planar)' };
        if (v === 2 && e <= 1) return { planar: true, message: 'Grafo con 2 nodos (planar)' };
        
        // Verificar si es K₅
        if (v === 5 && e === 10) {
            return { planar: false, message: 'El grafo es K₅ (No planar)' };
        }
        
        // Verificar si es K₃,₃
        if (v === 6 && PlanarityChecker.isCompleteBipartite(graph) && e === 9) {
            return { planar: false, message: 'El grafo es K₃,₃ (No planar)' };
        }
        
        // Fórmula general para grafos conexos
        if (e <= 3 * v - 6) {
            return { planar: true, message: 'El grafo es planar' };
        } else {
            return { planar: false, message: 'El grafo probablemente no es planar' };
        }
    }
    
    static isCompleteBipartite(graph) {
        if (graph.nodes.length !== 6) return false;
        
        const colors = {};
        const queue = [];
        const adjacency = graph.getAdjacencyList();
        
        // BFS para colorear
        const startNode = graph.nodes[0].id;
        colors[startNode] = 0;
        queue.push(startNode);
        
        while (queue.length > 0) {
            const node = queue.shift();
            
            for (const neighbor of adjacency[node]) {
                if (colors[neighbor] === undefined) {
                    colors[neighbor] = 1 - colors[node];
                    queue.push(neighbor);
                } else if (colors[neighbor] === colors[node]) {
                    return false;
                }
            }
        }
        
        // Verificar que sea completo bipartito
        const partitions = [[], []];
        Object.entries(colors).forEach(([nodeId, color]) => {
            partitions[color].push(nodeId);
        });
        
        // Verificar que haya 3 nodos en cada partición
        if (partitions[0].length !== 3 || partitions[1].length !== 3) {
            return false;
        }
        
        // Verificar que todos los nodos de una partición están conectados a todos los de la otra
        for (const nodeA of partitions[0]) {
            for (const nodeB of partitions[1]) {
                if (!graph.edges.some(edge => 
                    (edge.from === nodeA && edge.to === nodeB) || 
                    (edge.from === nodeB && edge.to === nodeA))) {
                    return false;
                }
            }
        }
        
        return true;
    }
}

// Clase GraphController para manejar la lógica de la aplicación
class GraphController {
    constructor() {
        // Inicializar elementos del DOM
        this.canvas = document.getElementById('graph-canvas');
        this.jsonTextarea = document.getElementById('graph-json');
        this.statusDiv = document.getElementById('status');
        
        // Inicializar grafo y visualizador
        this.graph = new Graph();
        this.visualizer = new GraphVisualizer(this.canvas, this.graph);
        
        // Configurar visualizador
        this.visualizer.onGraphChange = this.updateUI.bind(this);
        
        // Inicializar eventos
        this.initEventListeners();
        
        // Actualizar UI inicial
        this.updateUI();
    }
    
    initEventListeners() {
        // Botones de control
        document.getElementById('add-node').addEventListener('click', () => {
            this.graph.mode = 'add-node';
        });
        
        document.getElementById('add-edge').addEventListener('click', () => {
            this.graph.mode = 'add-edge';
            this.graph.edgeStart = null;
        });
        
        document.getElementById('clear').addEventListener('click', this.clearGraph.bind(this));
        document.getElementById('generate-k5').addEventListener('click', this.generateK5.bind(this));
        document.getElementById('generate-k33').addEventListener('click', this.generateK33.bind(this));
        document.getElementById('check-planar').addEventListener('click', this.checkPlanarity.bind(this));
        document.getElementById('update-from-json').addEventListener('click', this.updateGraphFromJson.bind(this));
        document.getElementById('download-json').addEventListener('click', this.downloadJSON.bind(this));
        document.getElementById('load-example').addEventListener('click', this.loadExample.bind(this));
        
        // Eventos del canvas
        this.canvas.addEventListener('mousedown', this.visualizer.handleMouseDown.bind(this.visualizer));
        this.canvas.addEventListener('mousemove', this.visualizer.handleMouseMove.bind(this.visualizer));
        this.canvas.addEventListener('mouseup', this.visualizer.handleMouseUp.bind(this.visualizer));
        
        // Soporte para pantallas táctiles
        this.canvas.addEventListener('touchstart', this.visualizer.handleTouchStart.bind(this.visualizer), { passive: false });
        this.canvas.addEventListener('touchmove', this.visualizer.handleTouchMove.bind(this.visualizer), { passive: false });
        this.canvas.addEventListener('touchend', this.visualizer.handleTouchEnd.bind(this.visualizer));
        
        // Evento para cambios en el JSON
        this.jsonTextarea.addEventListener('input', () => {
            try {
                const newGraph = JSON.parse(this.jsonTextarea.value);
                if (this.graph.fromJSON(newGraph)) {
                    this.visualizer.draw();
                }
            } catch (e) {
                // JSON inválido, no hacer nada
            }
        });
    }
    
    clearGraph() {
        this.graph.clear();
        this.updateUI('Grafo no verificado', null);
    }
    
    generateK5() {
        this.clearGraph();
        
        // Crear 5 nodos en un círculo
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = Math.min(rect.width, rect.height) / 3;
        
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            this.graph.addNode(x, y);
        }
        
        // Conectar todos los nodos entre sí (grafo completo)
        for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
                this.graph.addEdge(this.graph.nodes[i], this.graph.nodes[j], GRAPH_CONFIG.K5_COLOR);
            }
        }
        
        this.updateUI('K₅ generado (No planar)', false);
    }
    
    generateK33() {
        this.clearGraph();
        
        // Crear 6 nodos (2 grupos de 3)
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = Math.min(rect.width, rect.height) / 3;
        
        // Primer grupo (izquierda)
        for (let i = 0; i < 3; i++) {
            const x = centerX - radius;
            const y = centerY - radius + i * radius;
            this.graph.addNode(x, y);
        }
        
        // Segundo grupo (derecha)
        for (let i = 0; i < 3; i++) {
            const x = centerX + radius;
            const y = centerY - radius + i * radius;
            this.graph.addNode(x, y);
        }
        
        // Conectar todos los nodos del primer grupo con todos los del segundo
        for (let i = 0; i < 3; i++) {
            for (let j = 3; j < 6; j++) {
                this.graph.addEdge(this.graph.nodes[i], this.graph.nodes[j], GRAPH_CONFIG.K33_COLOR);
            }
        }
        
        this.updateUI('K₃,₃ generado (No planar)', false);
    }
    
    checkPlanarity() {
        const result = PlanarityChecker.check(this.graph);
        this.updateUI(result.message, result.planar);
    }
    
    updateGraphFromJson() {
        try {
            const newGraph = JSON.parse(this.jsonTextarea.value);
            if (this.graph.fromJSON(newGraph)) {
                this.updateUI('Grafo cargado desde JSON');
                this.visualizer.draw();
            } else {
                throw new Error('Formato de grafo inválido');
            }
        } catch (e) {
            alert(`Error al cargar JSON: ${e.message}`);
        }
    }
    
    downloadJSON() {
        const dataStr = JSON.stringify(this.graph.toJSON(), null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportName = `grafo-${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }
    
    loadExample() {
        const exampleGraph = {
            nodes: [
                {id: "n1", x: 200, y: 200},
                {id: "n2", x: 400, y: 200},
                {id: "n3", x: 300, y: 350}
            ],
            edges: [
                {from: "n1", to: "n2"},
                {from: "n1", to: "n3"},
                {from: "n2", to: "n3"}
            ]
        };
        
        this.jsonTextarea.value = JSON.stringify(exampleGraph, null, 2);
        this.updateGraphFromJson();
    }
    
    updateUI(message = null, isPlanar = null) {
        // Actualizar JSON
        this.jsonTextarea.value = JSON.stringify(this.graph.toJSON(), null, 2);
        
        // Actualizar estado
        if (message !== null) {
            this.statusDiv.textContent = message;
            this.statusDiv.className = 'status';
            
            if (isPlanar === true) {
                this.statusDiv.classList.add('status-planar');
            } else if (isPlanar === false) {
                this.statusDiv.classList.add('status-non-planar');
            } else {
                this.statusDiv.classList.add('status-neutral');
            }
        }
        
        // Redibujar el grafo
        this.visualizer.draw();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GraphController();
});