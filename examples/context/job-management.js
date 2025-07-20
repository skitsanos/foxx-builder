/**
 * Job Management Examples
 * 
 * Demonstrates background job execution and task scheduling using the enhanced context.
 * Shows the difference between immediate jobs and scheduled tasks.
 */

module.exports = {
    name: 'Job Management Examples',
    handler: (req, res) => {
        const { jobs, runTask } = module.context;
        
        // Example: Immediate background job execution
        function immediateJobExamples() {
            // Simple background job
            const jobId1 = jobs.run('send-email', {
                to: 'user@example.com',
                subject: 'Welcome!',
                template: 'welcome'
            });
            
            // Job with options
            const jobId2 = jobs.run('process-image', {
                imageId: '12345',
                operations: ['resize', 'watermark', 'optimize']
            }, {
                delay: 5000,        // Delay 5 seconds before execution
                maxFailures: 3,     // Retry up to 3 times on failure
                priority: 'high'    // High priority job
            });
            
            // Complex data processing job
            const jobId3 = jobs.run('generate-report', {
                reportType: 'analytics',
                dateRange: {
                    start: '2024-01-01',
                    end: '2024-01-31'
                },
                format: 'pdf',
                recipients: ['admin@example.com']
            }, {
                delay: 10000,       // Wait 10 seconds
                maxFailures: 2
            });
            
            return {
                emailJob: jobId1,
                imageJob: jobId2,
                reportJob: jobId3,
                message: 'Background jobs queued for execution'
            };
        }
        
        // Example: Scheduled task creation
        function scheduledTaskExamples() {
            // Daily maintenance task
            const dailyCleanup = runTask(
                'daily-cleanup',                    // Task name
                'cleanup-logs',                     // Script path (src/scripts/cleanup-logs.js)
                { days: 30 },                       // Parameters
                24 * 60 * 60 * 1000                // Period: 24 hours
            );
            
            // Hourly sync task
            const hourlySync = runTask(
                'hourly-data-sync',
                'sync-external-api',
                {
                    endpoint: 'https://api.example.com/data',
                    apiKey: 'secret-key',
                    batchSize: 100
                },
                60 * 60 * 1000                     // Period: 1 hour
            );
            
            // Weekly report task
            const weeklyReport = runTask(
                'weekly-analytics',
                'generate-weekly-report',
                {
                    recipients: ['team@example.com'],
                    includeCharts: true
                },
                7 * 24 * 60 * 60 * 1000           // Period: 7 days
            );
            
            return {
                dailyCleanup,
                hourlySync,
                weeklyReport,
                message: 'Scheduled tasks created'
            };
        }
        
        // Example: Job chaining and workflows
        function jobWorkflowExamples() {
            // Start a workflow with multiple dependent jobs
            const workflowId = `workflow-${Date.now()}`;
            
            // Step 1: Process uploaded file
            const step1JobId = jobs.run('process-upload', {
                fileId: req.body.fileId,
                workflowId: workflowId
            });
            
            // Step 2: Extract metadata (depends on step 1)
            const step2JobId = jobs.run('extract-metadata', {
                fileId: req.body.fileId,
                workflowId: workflowId,
                dependsOn: step1JobId
            }, {
                delay: 2000  // Small delay to ensure step 1 completes
            });
            
            // Step 3: Generate thumbnails (depends on step 1)
            const step3JobId = jobs.run('generate-thumbnails', {
                fileId: req.body.fileId,
                workflowId: workflowId,
                sizes: ['small', 'medium', 'large'],
                dependsOn: step1JobId
            }, {
                delay: 2000
            });
            
            // Step 4: Send notification (depends on steps 2 and 3)
            const step4JobId = jobs.run('send-completion-notification', {
                workflowId: workflowId,
                userId: req.user.id,
                dependsOn: [step2JobId, step3JobId]
            }, {
                delay: 5000
            });
            
            return {
                workflowId,
                steps: {
                    process: step1JobId,
                    metadata: step2JobId,
                    thumbnails: step3JobId,
                    notification: step4JobId
                },
                message: 'Workflow jobs queued'
            };
        }
        
        // Example: Batch job processing
        function batchJobExamples() {
            const batchData = req.body.items || [];
            const batchSize = 10;
            const jobIds = [];
            
            // Process large datasets in batches
            for (let i = 0; i < batchData.length; i += batchSize) {
                const batch = batchData.slice(i, i + batchSize);
                
                const jobId = jobs.run('process-batch', {
                    batchNumber: Math.floor(i / batchSize) + 1,
                    items: batch,
                    totalBatches: Math.ceil(batchData.length / batchSize)
                }, {
                    delay: i * 1000,  // Stagger batch processing
                    maxFailures: 2
                });
                
                jobIds.push(jobId);
            }
            
            // Schedule cleanup job after all batches
            if (jobIds.length > 0) {
                const cleanupJobId = jobs.run('batch-cleanup', {
                    batchJobIds: jobIds,
                    totalItems: batchData.length
                }, {
                    delay: (jobIds.length + 1) * 1000
                });
                
                jobIds.push(cleanupJobId);
            }
            
            return {
                totalItems: batchData.length,
                batches: Math.ceil(batchData.length / batchSize),
                jobIds: jobIds,
                message: 'Batch processing jobs queued'
            };
        }
        
        // Example: Error handling and monitoring
        function jobMonitoringExamples() {
            // Job with custom error handling
            const monitoredJobId = jobs.run('monitored-operation', {
                operation: 'complex-calculation',
                data: req.body.data
            }, {
                maxFailures: 3,
                onFailure: (error, attempt) => {
                    console.error(`Job failed on attempt ${attempt}:`, error);
                    
                    // Send alert on final failure
                    if (attempt >= 3) {
                        jobs.run('send-alert', {
                            type: 'job-failure',
                            jobId: monitoredJobId,
                            error: error.message
                        });
                    }
                },
                onSuccess: (result) => {
                    console.log('Job completed successfully:', result);
                    
                    // Send success notification
                    jobs.run('send-notification', {
                        type: 'job-success',
                        jobId: monitoredJobId,
                        result: result
                    });
                }
            });
            
            return {
                jobId: monitoredJobId,
                message: 'Monitored job started with error handling'
            };
        }
        
        // Example: Job abort and cleanup
        function jobControlExamples() {
            // Start a long-running job
            const longJobId = jobs.run('long-running-task', {
                duration: 30000,  // 30 seconds
                data: req.body.data
            });
            
            // Conditionally abort job
            if (req.queryParams.abort === 'true') {
                const aborted = jobs.abort(longJobId, true);  // true = remove from queue
                return {
                    message: 'Job aborted',
                    jobId: longJobId,
                    aborted: aborted
                };
            }
            
            // Schedule auto-abort after timeout
            setTimeout(() => {
                jobs.abort(longJobId, false);  // false = mark as cancelled but keep record
            }, 60000);  // Auto-abort after 1 minute
            
            return {
                jobId: longJobId,
                message: 'Long-running job started with auto-abort',
                autoAbortIn: '60 seconds'
            };
        }
        
        // Example: Priority job queuing
        function priorityJobExamples() {
            // High priority user request
            const urgentJobId = jobs.run('urgent-processing', {
                userId: req.user.id,
                requestType: 'urgent'
            }, {
                priority: 'urgent',
                maxFailures: 1
            });
            
            // Normal priority background task
            const normalJobId = jobs.run('background-maintenance', {
                type: 'routine-cleanup'
            }, {
                priority: 'normal',
                delay: 60000  // Can wait 1 minute
            });
            
            // Low priority analytics
            const lowJobId = jobs.run('analytics-processing', {
                type: 'daily-stats',
                date: new Date().toISOString().split('T')[0]
            }, {
                priority: 'low',
                delay: 300000  // Can wait 5 minutes
            });
            
            return {
                urgent: urgentJobId,
                normal: normalJobId,
                low: lowJobId,
                message: 'Jobs queued with different priorities'
            };
        }
        
        // Run examples based on request
        const exampleType = req.queryParams.example || 'immediate';
        
        switch (exampleType) {
            case 'immediate':
                return immediateJobExamples();
            case 'scheduled':
                return scheduledTaskExamples();
            case 'workflow':
                return jobWorkflowExamples();
            case 'batch':
                return batchJobExamples();
            case 'monitoring':
                return jobMonitoringExamples();
            case 'control':
                return jobControlExamples();
            case 'priority':
                return priorityJobExamples();
            default:
                res.json({
                    message: 'Job management examples',
                    availableExamples: [
                        'immediate', 'scheduled', 'workflow', 'batch',
                        'monitoring', 'control', 'priority'
                    ],
                    usage: '?example=immediate'
                });
        }
    }
};