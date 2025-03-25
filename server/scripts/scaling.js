const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class ScalingManager {
    constructor() {
        this.config = {
            autoScale: {
                enabled: true,
                minInstances: 2,
                maxInstances: 20,
                cpuThreshold: 70,
                memoryThreshold: 80,
                checkInterval: 15000,
                cooldownPeriod: 30000,
                scalingFactor: 1.5,
                scalingStrategies: {
                    cpu: {
                        thresholds: [70, 80, 90],
                        scaleFactors: [1.2, 1.5, 2.0]
                    },
                    memory: {
                        thresholds: [80, 90, 95],
                        scaleFactors: [1.3, 1.7, 2.5]
                    },
                    responseTime: {
                        thresholds: [500, 1000, 2000],
                        scaleFactors: [1.4, 1.8, 2.2]
                    }
                }
            },
            resourceOptimization: {
                enabled: true,
                maxIdleTime: 300000,
                maxMemoryUsage: 80,
                checkInterval: 30000,
                optimizationStrategies: {
                    memory: {
                        thresholds: [60, 70, 80],
                        actions: [
                            'compactMemory',
                            'clearCache',
                            'shutdownIdle'
                        ]
                    },
                    cpu: {
                        thresholds: [20, 30, 40],
                        actions: [
                            'optimizeProcesses',
                            'reduceThreads',
                            'shutdownIdle'
                        ]
                    }
                }
            }
        };
        this.lastScaleTime = 0;
        this.currentInstances = 0;
        this.metrics = {
            cpu: [],
            memory: [],
            responseTime: []
        };
    }

    async initialize() {
        console.log('Initializing scaling manager...');
        
        // Create logs directory if it doesn't exist
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        // Start monitoring
        this.startMonitoring();
    }

    async startMonitoring() {
        console.log('Starting monitoring...');
        
        // Start CPU/Memory monitoring for auto-scaling
        if (this.config.autoScale.enabled) {
            this.monitorResources();
        }

        // Start resource optimization monitoring
        if (this.config.resourceOptimization.enabled) {
            this.optimizeResources();
        }
    }

    async monitorResources() {
        try {
            const stats = this.getSystemStats();
            const responseTime = await this.getResponseTime();
            
            // Collect metrics
            this.metrics.cpu.push(stats.cpuUsage);
            this.metrics.memory.push(stats.memoryUsage);
            this.metrics.responseTime.push(responseTime);
            
            // Keep only last 10 measurements
            this.metrics.cpu = this.metrics.cpu.slice(-10);
            this.metrics.memory = this.metrics.memory.slice(-10);
            this.metrics.responseTime = this.metrics.responseTime.slice(-10);
            
            // Calculate average metrics
            const avgCpu = this.calculateAverage(this.metrics.cpu);
            const avgMemory = this.calculateAverage(this.metrics.memory);
            const avgResponseTime = this.calculateAverage(this.metrics.responseTime);
            
            // Determine scaling factor based on multiple metrics
            const scalingFactor = this.calculateScalingFactor({
                cpu: avgCpu,
                memory: avgMemory,
                responseTime: avgResponseTime
            });
            
            if (scalingFactor > 1) {
                const timeSinceLastScale = Date.now() - this.lastScaleTime;
                if (timeSinceLastScale >= this.config.autoScale.cooldownPeriod) {
                    await this.scaleInstances(scalingFactor);
                }
            }

            setTimeout(() => this.monitorResources(), this.config.autoScale.checkInterval);
        } catch (error) {
            console.error('Error monitoring resources:', error);
            setTimeout(() => this.monitorResources(), this.config.autoScale.checkInterval);
        }
    }

    async optimizeResources() {
        try {
            const instances = await this.getDockerInstances();
            
            for (const instance of instances) {
                const stats = await this.getInstanceStats(instance.id);
                const idleTime = await this.checkIdleTime(instance.id);
                
                // Memory optimization
                if (stats.memoryUsage < this.config.resourceOptimization.maxMemoryUsage) {
                    const memoryIndex = this.config.resourceOptimization.optimizationStrategies.memory.thresholds
                        .findIndex(t => stats.memoryUsage <= t);
                    
                    if (memoryIndex !== -1) {
                        const action = this.config.resourceOptimization.optimizationStrategies.memory.actions[memoryIndex];
                        await this.performMemoryOptimization(instance.id, action);
                    }
                }
                
                // CPU optimization
                if (stats.cpuUsage < 30) { // Base threshold for CPU optimization
                    const cpuIndex = this.config.resourceOptimization.optimizationStrategies.cpu.thresholds
                        .findIndex(t => stats.cpuUsage <= t);
                    
                    if (cpuIndex !== -1) {
                        const action = this.config.resourceOptimization.optimizationStrategies.cpu.actions[cpuIndex];
                        await this.performCpuOptimization(instance.id, action);
                    }
                }
                
                // Check for complete shutdown
                if (idleTime > this.config.resourceOptimization.maxIdleTime &&
                    stats.memoryUsage < 60 &&
                    stats.cpuUsage < 20) {
                    await this.optimizeInstance(instance.id);
                }
            }

            setTimeout(() => this.optimizeResources(), this.config.resourceOptimization.checkInterval);
        } catch (error) {
            console.error('Error optimizing resources:', error);
            setTimeout(() => this.optimizeResources(), this.config.resourceOptimization.checkInterval);
        }
    }

    async scaleInstances(factor) {
        try {
            const currentInstances = await this.getDockerInstances();
            const currentCount = currentInstances.length;
            
            // Calculate new instance count based on scaling factor
            let newCount = Math.round(currentCount * factor);
            newCount = Math.max(this.config.autoScale.minInstances, 
                Math.min(newCount, this.config.autoScale.maxInstances));
            
            if (newCount !== currentCount) {
                await this.scaleDockerInstances(newCount);
                this.lastScaleTime = Date.now();
                
                this.logScaleEvent('scale-up', currentCount, newCount, {
                    cpu: this.calculateAverage(this.metrics.cpu),
                    memory: this.calculateAverage(this.metrics.memory),
                    responseTime: this.calculateAverage(this.metrics.responseTime)
                });
            }
        } catch (error) {
            console.error('Error scaling instances:', error);
        }
    }

    async optimizeInstance(instanceId) {
        try {
            await exec(`docker stop ${instanceId}`);
            await exec(`docker rm ${instanceId}`);
            
            this.logOptimizationEvent(instanceId);
        } catch (error) {
            console.error('Error optimizing instance:', error);
        }
    }

    getSystemStats() {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        const cpuUsage = cpus.reduce((acc, cpu) => acc + cpu.times.user + cpu.times.sys, 0);
        const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
        
        return {
            cpuUsage: Math.round(cpuUsage / cpus.length),
            memoryUsage: Math.round(memoryUsage)
        };
    }

    async getInstanceStats(instanceId) {
        try {
            const { stdout } = await exec(`docker stats --no-stream ${instanceId}`);
            const stats = stdout.split('\n')[1].split(' ').filter(Boolean);
            
            return {
                cpuUsage: parseFloat(stats[2].replace('%', '')),
                memoryUsage: parseFloat(stats[6].replace('%', ''))
            };
        } catch (error) {
            console.error('Error getting instance stats:', error);
            return { cpuUsage: 0, memoryUsage: 0 };
        }
    }

    async checkIdleTime(instanceId) {
        try {
            const { stdout } = await exec(`docker inspect --format='{{.State.StartedAt}}' ${instanceId}`);
            const startTime = new Date(stdout.trim());
            const currentTime = new Date();
            return currentTime - startTime;
        } catch (error) {
            console.error('Error checking idle time:', error);
            return 0;
        }
    }

    async getDockerInstances() {
        try {
            const { stdout } = await exec('docker ps --format "{{.ID}} {{.Image}} {{.Status}}"');
            return stdout.split('\n').filter(Boolean).map(line => {
                const [id, image, status] = line.split(' ');
                return { id, image, status };
            });
        } catch (error) {
            console.error('Error getting Docker instances:', error);
            return [];
        }
    }

    async scaleDockerInstances(targetCount) {
        try {
            const currentInstances = await this.getDockerInstances();
            const currentCount = currentInstances.length;
            
            if (currentCount < targetCount) {
                // Scale up
                for (let i = currentCount; i < targetCount; i++) {
                    await exec('docker-compose up --scale server=1');
                }
            } else if (currentCount > targetCount) {
                // Scale down
                for (let i = currentCount; i > targetCount; i--) {
                    const instance = currentInstances[i - 1];
                    await exec(`docker stop ${instance.id}`);
                    await exec(`docker rm ${instance.id}`);
                }
            }
        } catch (error) {
            console.error('Error scaling Docker instances:', error);
        }
    }

    calculateAverage(values) {
        return values.reduce((acc, val) => acc + val, 0) / values.length;
    }

    calculateScalingFactor(metrics) {
        let scalingFactor = 1;
        
        // CPU scaling
        const cpuIndex = this.config.autoScale.scalingStrategies.cpu.thresholds
            .findIndex(t => metrics.cpu >= t);
        if (cpuIndex !== -1) {
            scalingFactor = Math.max(scalingFactor, 
                this.config.autoScale.scalingStrategies.cpu.scaleFactors[cpuIndex]);
        }
        
        // Memory scaling
        const memoryIndex = this.config.autoScale.scalingStrategies.memory.thresholds
            .findIndex(t => metrics.memory >= t);
        if (memoryIndex !== -1) {
            scalingFactor = Math.max(scalingFactor, 
                this.config.autoScale.scalingStrategies.memory.scaleFactors[memoryIndex]);
        }
        
        // Response time scaling
        const responseTimeIndex = this.config.autoScale.scalingStrategies.responseTime.thresholds
            .findIndex(t => metrics.responseTime >= t);
        if (responseTimeIndex !== -1) {
            scalingFactor = Math.max(scalingFactor, 
                this.config.autoScale.scalingStrategies.responseTime.scaleFactors[responseTimeIndex]);
        }
        
        return scalingFactor;
    }

    async getResponseTime() {
        try {
            const { stdout } = await exec('curl -o /dev/null -s -w "%{time_total}\n" http://localhost:3000/health');
            return parseFloat(stdout) * 1000; // Convert to milliseconds
        } catch (error) {
            console.error('Error getting response time:', error);
            return 0;
        }
    }

    logScaleEvent(action, oldCount, newCount, stats) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            oldInstanceCount: oldCount,
            newInstanceCount: newCount,
            stats: {
                cpuUsage: stats.cpu,
                memoryUsage: stats.memory,
                responseTime: stats.responseTime
            }
        };

        const logPath = path.join(__dirname, '../logs/scaling.log');
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    }

    async performMemoryOptimization(instanceId, action) {
        try {
            switch(action) {
                case 'compactMemory':
                    await exec(`docker exec ${instanceId} echo 1 > /proc/sys/vm/compact_memory`);
                    break;
                case 'clearCache':
                    await exec(`docker exec ${instanceId} sync; echo 3 > /proc/sys/vm/drop_caches`);
                    break;
                case 'shutdownIdle':
                    const stats = await this.getInstanceStats(instanceId);
                    if (stats.cpuUsage < 10) {
                        await this.optimizeInstance(instanceId);
                    }
                    break;
            }
            
            this.logOptimizationEvent(instanceId, 'memory', action);
        } catch (error) {
            console.error('Error performing memory optimization:', error);
        }
    }

    async performCpuOptimization(instanceId, action) {
        try {
            switch(action) {
                case 'optimizeProcesses':
                    await exec(`docker exec ${instanceId} pkill -f "sleep|idle"`);
                    break;
                case 'reduceThreads':
                    await exec(`docker exec ${instanceId} sysctl -w kernel.sched_min_granularity_ns=10000000`);
                    break;
                case 'shutdownIdle':
                    const stats = await this.getInstanceStats(instanceId);
                    if (stats.memoryUsage < 50) {
                        await this.optimizeInstance(instanceId);
                    }
                    break;
            }
            
            this.logOptimizationEvent(instanceId, 'cpu', action);
        } catch (error) {
            console.error('Error performing CPU optimization:', error);
        }
    }

    logOptimizationEvent(instanceId, type, action) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'optimize',
            instanceId,
            type,
            optimizationAction: action
        };

        const logPath = path.join(__dirname, '../logs/optimization.log');
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    }

    logOptimizationEvent(instanceId) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'optimize',
            instanceId
        };

        const logPath = path.join(__dirname, '../logs/optimization.log');
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    }
}

// Export the scaling manager
module.exports = new ScalingManager();
