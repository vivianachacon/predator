import React from 'react';
import {connect} from 'react-redux';
import * as selectors from './redux/selectors/reportsSelector';
import {createJobSuccess, errorOnStopRunningJob, stopRunningJobSuccess} from './redux/selectors/jobsSelector';
import {tests} from './redux/selectors/testsSelector';
import Snackbar from 'material-ui/Snackbar';
import style from './style.scss';
import Dialog from './components/Dialog';
import * as Actions from './redux/action';
import Page from '../components/Page';
import _ from 'lodash';
import Report from './components/Report';
import {createJobRequest} from './requestBuilder';

import {ReactTableComponent} from './../components/ReactTable';
import {getColumns} from './configurationColumn'

const REFRESH_DATA_INTERVAL = 30000;

const columnsNames = ['test_name', 'start_time', 'end_time', 'duration', 'status', 'arrival_rate',
    'ramp_to', 'last_success_rate', 'last_rps', 'parallelism', 'notes', 'report', 'grafana_report', 'rerun', 'raw', 'logs', 'stop'];
const DESCRIPTION = 'Reports give you insight into the performance of your API. Predator generates a report for each test that is executed.';

class getReports extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showReport: false,
            sortedReports: [],
            sortHeader: '',
            rerunJob: null

        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.reports !== this.props.reports) {
            this.setState({sortedReports: [...this.props.reports]})
        }
    }


    onRawView = (report) => {
        this.setState({openViewReport: report});
    };

    onRunTest = (job) => {
        const requestBody = createJobRequest(job);
        delete requestBody.cron_expression;
        requestBody.run_immediately = true;
        this.props.createJob(requestBody);
        this.setState({rerunJob: job});
    };

    closeViewReportDialog = () => {
        this.setState({
            openViewReport: false
        });
    };

    onReportView = (report) => {
        this.setState({showReport: report})
    };


    onStop = (row) => {
        this.props.stopRunningJob(row.job_id, row.report_id);
    }


    componentDidMount() {
        this.loadPageData();
        this.refreshDataInterval = setInterval(this.loadPageData, REFRESH_DATA_INTERVAL)
    }

    closeReport = () => {
        this.setState({showReport: null})
    }
    loadPageData = () => {
        this.props.getTests();
        this.props.clearErrorOnGetReports();
        this.props.getAllReports();
    };

    componentWillUnmount() {
        this.props.clearErrorOnGetReports();
        this.props.clearSelectedReport();
        clearInterval(this.refreshDataInterval);
    }

    onSort = (field) => {
        const {sortHeader} = this.state;
        let isAsc = false;
        if (sortHeader.includes(field)) {
            isAsc = !sortHeader.includes('+')
        } else {
            isAsc = true;
        }
        let sortedReport;
        if (isAsc) {
            sortedReport = _.chain(this.state.sortedReports).sortBy(field).reverse().value();
        } else {
            sortedReport = _.chain(this.state.sortedReports).sortBy(field).value();
        }
        this.setState({sortedReports: sortedReport, sortHeader: `${field}${isAsc ? '+' : '-'}`})
    };
    onSearch = (value) => {
        if (!value) {
            this.setState({sortedReports: [...this.props.reports]})
        }
        const newSorted = _.filter(this.props.reports, (report) => {
            return (String(report.test_name).toLowerCase().includes(value.toLowerCase()) || String(report.status).toLowerCase().includes(value.toLowerCase()))
        });
        this.setState({sortedReports: newSorted})
    };

    render() {

        const {showReport, sortHeader, sortedReports} = this.state;
        const columns = getColumns({
            columnsNames,
            sortHeader,
            onSort: this.onSort,
            onReportView: this.onReportView,
            onRawView: this.onRawView,
            onStop: this.onStop,
            onRunTest: this.onRunTest
        });
        const feedbackMessage = this.generateFeedbackMessage();
        return (
            <Page title={'Last Reports'} description={DESCRIPTION}>
                <div style={{width: '100%'}}>
                    {showReport && <Report onClose={this.closeReport} key={showReport.report_id} report={showReport}/>}
                    <ReactTableComponent
                        // tableRowId={'report_id'}
                        onSearch={this.onSearch}
                        rowHeight={'46px'}
                        manual={false}
                        data={sortedReports}
                        pageSize={10}
                        columns={columns}
                        showPagination
                        resizable={false}
                        cursor={'default'}
                        className={style.table}
                    />
                </div>
                {this.state.openViewReport
                    ? <Dialog title_key={'id'} data={this.state.openViewReport}
                              closeDialog={this.closeViewReportDialog}/> : null}

                {feedbackMessage && <Snackbar
                    open={(!!(this.props.stopRunningJobSuccess || this.props.jobSuccess))}
                    bodyStyle={{backgroundColor: '#2fbb67'}}
                    message={feedbackMessage}
                    autoHideDuration={4000}
                    onRequestClose={() => {
                        this.props.getAllReports();
                        this.props.clearStopJobSuccess();
                        this.props.clearStoppedJobError();
                        this.props.createJobSuccess(undefined);
                        this.setState({
                            showSnackbar: false,
                            rerunJob: null
                        });
                    }}
                />}
            </Page>
        )
    }

    generateFeedbackMessage = () => {
        if (this.props.stopRunningJobSuccess) {
            return 'Job successfully aborted'
        }
        if (this.props.jobSuccess && this.state.rerunJob) {
            return `Job created successfully: ${this.props.jobSuccess.id}`;
        }

    }


}

function mapStateToProps(state) {
    return {
        reports: selectors.reports(state),
        report: selectors.report(state),
        processingGetReports: selectors.processingGetReports(state),
        errorOnGetReports: selectors.errorOnGetReports(state),
        errorOnGetReport: selectors.errorOnGetReport(state),
        errorOnStopRunningJob: errorOnStopRunningJob(state),
        stopRunningJobSuccess: stopRunningJobSuccess(state),
        tests: tests(state),
        jobSuccess: createJobSuccess(state)
    }
}

const mapDispatchToProps = {
    clearSelectedReport: Actions.clearSelectedReport,
    clearErrorOnGetReports: Actions.clearErrorOnGetReports,
    getAllReports: Actions.getLastReports,
    getReport: Actions.getReport,
    stopRunningJob: Actions.stopRunningJob,
    clearStopJobSuccess: Actions.clearStopJobSuccess,
    clearStoppedJobError: Actions.clearErrorOnStopJob,
    createJob: Actions.createJob,
    getTests: Actions.getTests,
    createJobSuccess: Actions.createJobSuccess
};

export default connect(mapStateToProps, mapDispatchToProps)(getReports);
