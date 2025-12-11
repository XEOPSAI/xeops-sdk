pipeline {
    agent any

    environment {
        XEOPS_API_KEY = credentials('xeops-api-key')
        SCAN_URL = 'https://staging.example.com'
    }

    stages {
        stage('Setup') {
            steps {
                script {
                    sh 'npm install -g @xeops/scanner-cli'
                }
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    sh '''
                        xeops-scan scan \
                            --url $SCAN_URL \
                            --api-key $XEOPS_API_KEY \
                            --wait \
                            --timeout 1800 \
                            --pdf security-report.pdf \
                            --validate-poc \
                            --fail-on-high \
                            --json > scan-results.json
                    '''
                }
            }
        }

        stage('Parse Results') {
            steps {
                script {
                    def results = readJSON file: 'scan-results.json'
                    def critical = results.metadata?.criticalCount ?: 0
                    def high = results.metadata?.highCount ?: 0
                    def medium = results.metadata?.mediumCount ?: 0
                    def low = results.metadata?.lowCount ?: 0

                    echo "Security Scan Results:"
                    echo "  Critical: ${critical}"
                    echo "  High: ${high}"
                    echo "  Medium: ${medium}"
                    echo "  Low: ${low}"

                    currentBuild.description = "Critical: ${critical} | High: ${high} | Medium: ${medium} | Low: ${low}"
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'security-report.pdf,scan-results.json',
                           fingerprint: true,
                           allowEmptyArchive: true

            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'security-report.pdf',
                reportName: 'XeOps Security Report'
            ])
        }

        failure {
            emailext(
                subject: "Security Scan Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Security vulnerabilities found. Check the report at ${env.BUILD_URL}",
                to: "${env.SECURITY_TEAM_EMAIL}"
            )
        }
    }
}
