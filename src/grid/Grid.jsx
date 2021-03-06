import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Panel } from '../components/other/Panel';
import { Container } from '../container/Container';
import { TableColumnHeader } from './TableColumnHeader';
import { Sort } from './Sort';
import { LoadingMask } from '../util/LoadingMask';
import { isEqual, isEqualWith, isFunction, isMatch } from 'lodash';
import Clay from 'clay.js';

export class Grid extends Component
{
    static get defaultProps(){
        return {
            mode: 'normal', // available options are auto, fit
            sortable: true // We allow sorting by default
        };
    }

    constructor(props)
    {
        super(props);

        this.state = {
            sortField: props.sortField,
            sortOrder: props.sortOrder
        };

        this.onResize = this.onResize.bind(this);
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.getHeader = this.getHeader.bind(this);
        this.onHeaderClick = this.onHeaderClick.bind(this);
        this.onDoubleClick = this.onDoubleClick.bind(this);
        this.onRowClick = this.onRowClick.bind(this);
    }

    onHeaderClick(column)
    {
        let config = this.getColumnConfig(column.props.index);

        if(config.dataIndex != null)
        {
            let sort = null;

            if(config.dataIndex == this.state.sortField)
                sort = new Sort(config.dataIndex, this.state.sortOrder).toggle();
            else
                sort = new Sort(config.dataIndex);

            this.setSort(sort.field, sort.order);
        }
    }

    componentWillReceiveProps(nextProps)
    {
        this.setState({sortField: nextProps.sortField, sortOrder: nextProps.sortOrder});
    }

    setSort(column, order)
    {
        if(typeof column == 'number')
            column = this.getColumnConfig(column).dataIndex;

        this.setState({sortField: column, sortOrder: order});
    }

    onDoubleClick(event)
    {
        let row = event.target.closest("tr");

        if(row != null)
        {
            if(this.props.onRowDoubleClick)
                this.props.onRowDoubleClick(this.getRecord(this.getRowIndex(row)));
        }
    }

    getRowIndex(row)
    {
        return row != null ? row.dataset.index : null;
    }

    getRowSample(body)
    {
        return body.querySelector("tr");
    }

    getResizeElement(bodyWrapper)
    {
        return bodyWrapper.querySelector(".grid-body");
    }

    componentDidMount()
	{
        let dom = this.grid;

        let headerWrapper = dom.querySelector(".grid-hd-wrapper");
        let bodyWrapper = dom.querySelector(".grid-bd-wrapper");

        bodyWrapper.addEventListener('scroll', function(){
            headerWrapper.scrollLeft = this.scrollLeft;
        });

        let resizeElement = this.getResizeElement(bodyWrapper);

        // Start sensor to detect resize
        let clay = new Clay(resizeElement);
        clay.on('resize', this.onResize);

        // Check first if it's necessary to start an instance of the MutationObserver
        if(dom.closest(".tab-item") != null)
        {
            let self = this;

            // This is a horrible but necessary hack to detect when the
            // Grid becomes visible if it's inside a tab panel
            this.observer = new MutationObserver(function(mutations){
                mutations.forEach(function(mutation) {
                    if(mutation.target.style.display != 'none')
                        self.onResize();
               });
            });

            this.observer.observe(dom.closest(".tab-item"), {
                attributes:    true,
                attributeFilter: ["style"]
            });
        }

        // This is required so when an element become visible and this is executed the columns could be in synch
        this.onResize();
	}

    componentDidUpdate(prevProps, prevState)
    {
        // For an unknown reason to me this method doesn't trigger the resize sensor
        this.onResize();

        this.validateSelection();
    }

    componentWillUnmount()
    {
        if(this.observer)
            this.observer.disconnect();
    }

    shouldComponentUpdate(nextProps, nextState)
    {
        let propsAreEqual = isEqualWith(this.props, nextProps, function(val1, val2)
        {
            if(isFunction(val1) && isFunction(val2))
                return val1.toString() === val2.toString();
        });

        // Need to use isMatch to perform an unordered comparison
        let statesAreEqual = isEqualWith(this.state, nextState, function(val1, val2){
            if(Array.isArray(val1) && Array.isArray(val2))
                return isMatch(val1, val2);
        });

        let update = !propsAreEqual || !statesAreEqual;

        return update;
    }

    onResize()
    {
        let dom = this.grid;

        if(dom != null)
        {
            let headerWrapper = dom.querySelector(".grid-hd-wrapper");
            let bodyWrapper = dom.querySelector(".grid-bd-wrapper");

            let body = bodyWrapper.querySelector(".grid-body");
            let header = headerWrapper.querySelector(".grid-header");

            // If the body scroll is visible then display the vertical scroll to keep the same width
            if(bodyWrapper.scrollHeight > bodyWrapper.clientHeight)
                headerWrapper.style.overflowY = 'scroll';
            else
                headerWrapper.style.overflowY = null;

            this.resizeColumns(header, body);
        }
    }

    resizeColumns(header, body)
    {
        let self = this;

        // This will retrieve the first row
        let row = self.getRowSample(body);

        if(row != null)
        {
            let headers = header.querySelectorAll("tr:last-child");
            let bodyCells = row.querySelectorAll("td");

            let columnConfig = null;
            let columnWidth = null;
            let minWidth = null;
            let columns = this.getColumns(self.props.columns);

            self.setColumnsWidth(bodyCells);

            bodyCells.forEach(function(column, index){

                columnConfig = columns[index];
                minWidth = columnConfig.minWidth || 50;
                columnWidth = column.getBoundingClientRect().width;

                headers.forEach(function(header){

                    header.cells[index].style.width = columnWidth + 'px';
                    header.cells[index].style.minWidth = columnWidth + 'px';
                    header.cells[index].style.maxWidth = columnWidth + 'px';
                });
            });
        }
        else
            self.setHeadersWidth(header.querySelectorAll("th"));
    }

    setHeadersWidth(headers)
    {
        this.setColumnsWidth(headers);
    }

    getColumns(columns)
    {
        let fields = [];

        columns.forEach(function(column, index){
            if(column.items != null)
                fields = fields.concat(column.items);
            else
                fields.push(column);
        });

        return fields;

    }

    getColumnWidth(width)
    {
        let result = width instanceof Number ? width + 'px' : width

        return result;
    }

    setColumnsWidth(columns)
    {
        let self = this;

        columns.forEach(function(column, index){
            let columnConfig = self.getColumnConfig(index);

            if(columnConfig != null)
            {
                if(columnConfig.width)
                    column.style.width = self.getColumnWidth(columnConfig.width);
                else
                    column.style.width = null;

                if(columnConfig.minWidth)
                    column.style.minWidth = self.getColumnWidth(columnConfig.minWidth);
                else
                    column.style.minWidth = null;

                if(columnConfig.maxWidth)

                    column.style.maxWidth = self.getColumnWidth(columnConfig.maxWidth);
                else
                    column.style.maxWidth = null;
            }
        });
    }

	onRowClick(event)
    {
        let dom = this.grid;
        let target = event.target.closest("tr");
        let current = dom.querySelector('.x-selected');
        let targetIndex = this.getRowIndex(target);
        let currentIndex = this.getRowIndex(current);

        if(this.props.onRowClick)
            this.props.onRowClick(this.getRecord(this.getRowIndex(target)));

        if(targetIndex != currentIndex)
        {
            if(current != null)
                current.classList.remove('x-selected');

            target.classList.add('x-selected');

            this.onSelectionChange(this.getRecord(targetIndex), this.getRecord(currentIndex));
        }
        else
            if(event.ctrlKey)
            {
                if(target != null)
                    target.classList.remove('x-selected');

                this.onSelectionChange(null, this.getRecord(currentIndex));
            }
    }

    onSelectionChange(current, previous)
    {
        if(this.props.onSelectionChange)
        {
            this.currentSelection = current;
            this.props.onSelectionChange(current, previous);
        }
    }

    validateSelection()
    {
        let selected = this.getSelectedRecord();
        let previous = this.currentSelection;

        // TODO: Add an id property to remove this hardcoded _id
        let selectedId = selected != null ? selected._id : null;
        let previousId = previous != null ? previous._id : null;

        if(selectedId != previousId)
            this.onSelectionChange(selected, previous);
    }

    getColumnConfig(index)
    {
        return this.props.columns[index];
    }

    getRecord(index)
    {
        // TODO: Add validations
        return index >= 0 ? this.props.records[index] : null;
    }

    getRecords(columns, width)
    {
        let data = this.sortData();

        return this.createRows(data, columns, width);
    }

    sortData()
    {
        let sortOrder = this.state.sortOrder;
        let dataIndex = this.state.sortField;

        if(sortOrder != null && dataIndex != null)
        {
            let order = sortOrder == 'ASC' ? 1 : -1;

            return this.props.records.sort(function(a, b){

                a = a[dataIndex];
                b = b[dataIndex];


                return (a === b ? 0 : a > b ? 1 : -1) * order;
            });
        }
        else
            return this.props.records;
    }

    getSelectedRecord()
    {
        let dom = this.grid;

        let body = dom.querySelector(".grid-bd-wrapper");
        let row = body.querySelector("tr.x-selected");

        if(row != null)
            return this.getRecord(this.getRowIndex(row));
        else
            return null;
    }

    getHeader(column, row, index, content, width)
    {
        let config = typeof content != 'object' ? {text: content} : content;
        let key = "th-" + row + "-" + index;
        let colSpan = column.items ? column.items.length: column.colSpan;
        let align = config.align || column.align;
        let isSortable = this.props.sortable && column.sortable !== false;
        let text = config.text;

        return <TableColumnHeader   key={key}
                                    index={index}
                                    align={align}
                                    colSpan={colSpan}
                                    sort={isSortable && column.dataIndex == this.state.sortField && column.dataIndex != null ? this.state.sortOrder : null}
                                    onClick={isSortable ? this.onHeaderClick : null }>{text}</TableColumnHeader>;
    }

    getMoney(value, config)
    {
        value = !isNaN(value = parseFloat(value)) ? value : 0;

        return this.getNumber(value, {style: 'currency', currency: config.currency, minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals});
    }

    getInteger(value, config)
    {
        return this.getNumber(value);
    }

    getDecimal(value, config)
    {
        return this.getNumber(value, {minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals});
    }

    getNumber(value, options)
    {
        return value.toLocaleString('en-US', options || {});
    }

    createRows(records, columns, width)
    {
        let self = this;

        return records.map(function(record, rowIndex){
            var cells = columns.map(function(column, columnIndex){
                var align = "align-" + (column.align ? column.align : "left");
                var data = null;

                if(column.renderer == null)
                {
                    data = record[column.dataIndex];

                    if(column.format != null)
                    {
                        let config = column.format;

                        if(typeof column.format == 'string')
                            config = {type: column.format};

                        if(config.type == 'money')
                        {
                            config = Object.assign({
                                decimals: 2,
                                currency: 'USD'
                            }, config);

                            // Implement Intl.NumberFormat
                            data = self.getMoney(data, config);
                        }
                        else
                            if(config.type == 'integer')
                                data = self.getInteger(data, config);
                            else
                                if(config.type == 'decimal')
                                    data = self.getDecimal(data, config);

                    }
                }
                else
                    data = column.renderer(record, rowIndex, records);

                let style = Object.assign({}, {

                });

                return (<td key={"cell-" + rowIndex + "-" + columnIndex} className={"grid-cell-body " + align} colSpan={column.colSpan} style={style}>
                            <div className="text" style={{overflow: (column.overflow ? 'visible' : 'hidden')}}>{typeof data == 'boolean' ? data.toString() : data}</div>
                        </td>
                );
            });

            let classes = ['grid-row'];

            if(record.className)
                classes.push(record.className);

            return (<tr id={"tr-" + record._id} className={classes.join(' ')} data-index={rowIndex} key={"tr-" + (record._id || rowIndex)} data-id={record.id} onClick={self.onRowClick} onDoubleClick={self.onDoubleClick}>{cells}</tr>);
        });
    }

    render()
    {
        let columns = this.props.columns;
        let width = ((100/columns.length).toFixed(2) + "%");
        let rows = [{headers: []}];
        let self = this;
        let fields = [];

        columns.forEach(function(column, index){
                if(self != null)
                {
                    rows[0].headers.push(self.getHeader(column, 0, index, column.header, width));

                    if(column.items != null)
                    {
                        if(rows.length == 1)
                            rows.push({headers: []});

                        let width2 = ((100 / column.items.length).toFixed(2) + "%");

                        column.items.forEach(function(column2, index2){
                            rows[1].headers.push(self.getHeader(column2, index, index2, column2.header, width2));
                        });

                        fields = fields.concat(column.items);
                    }
                    else
                        fields.push(column);
                }
        });

        let headers = rows.map(function(row, index){
            let headers = row.headers.map(function(header){
                return header;
            });

            return <tr key={"row-header-" + index}>{headers}</tr>;
        });

        let records = this.props.rows || this.getRecords(fields, width);

        let classes = ['grid-panel', this.props.mode];

        if(this.props.className)
            classes.push(this.props.className);

        return (
            <Container myRef={(c) => {this.grid = c;}} id={this.props.id} className={classes.join(' ')} style={this.props.style} layout="border" region={this.props.region} orientation="vertical" overflow={false}>
                {this.props.toolbar}
                <Container className="grid-hd-wrapper" region="north">
                    <table className="grid-header">
                        <thead>
                            {headers}
                        </thead>
                    </table>
                </Container>
                <Container className={"grid-bd-wrapper " + (this.props.loading ? 'mask' : '')} region="center" scrollable={true}>
                    <table className="grid-body">
                        <tbody>
                            {records}
                        </tbody>
                    </table>
                </Container>
            </Container>
        );
    }
}
