/*
 * Copyright 2011 DTO Labs, Inc. (http://dtolabs.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Control execution follow page state for an execution
 */
var FollowControl = Class.create({
    executionId:null,
    targetElement:null,
    cmdoutputtbl: null,
    cmdoutspinner: null,
    runningcmd: null,
    appendtop: {value: false,changed: false},
    collapseCtx: {value:true,changed:false},
    showFinalLine: {value:true,changed:false},
    groupOutput: {value: true},
    autoscroll: true,

    lastrow:null,
    contextIdCounter: 0,
    contextStatus: {},

    lastTBody:null,
    ctxBodySet: new Array(),
    ctxBodyFinalSet: new Array(),
    ctxGroupSet: new Array(),

    //node mode
    ctxGroupTbodies:{},

    taildelay: 1,
    isrunning: false,
    starttime:null,
    updatepagetitle:false,

    //instance vars
    extraParams:{},
    totalCount:0,
    totalDuration:0,
    killjobhtml:'',
    execData:{},
    nodemode:false,
    browsemode:false,
    tailmode:false,
    refresh:false,
    lastlines:20,
    iconUrl:'/images/icon',
    appLinks:{},
    
    initialize: function(eid,elem,params){
        this.executionId=eid;
        this.targetElement=elem;
        Object.extend(this,params);
        this.refresh= this.tailmode;
        console.log(this);
    },
    appendCmdOutputError: function (message) {
        if ($('cmdoutputerror')) {
            $("cmdoutputerror").innerHTML += message;
            $("cmdoutputerror").show();
        }
    },
    _log: function(message) {
        if ($('log')) {
            $("log").innerHTML += message + "<br>";
        }
    },

    updateTaildelay: function(val) {
        val = parseInt(val);
        if (isNaN(val)) {
            val = 1;
        }
        if (val > 60) {
            val = 60;
        } else if (val < 0) {
            val = 0;
        }
        this.taildelay = val;
        $('taildelayvalue').value = this.taildelay;

        return false;
    },
    modifyTaildelay: function(val) {
        var oldval = parseInt($('taildelayvalue').value);
        val = parseInt(val);
        oldval = oldval + val;
        this.updateTaildelay(oldval);
    },

    updateLastlines: function(val) {
        val = parseInt(val);
        if (isNaN(val)) {
            val = 20;
        }
        if (val > 100) {
            val = 100;
        } else if (val < 5) {
            val = 5;
        }
        this.lastlines = val;
        $('lastlinesvalue').value = this.lastlines;
        if (!this.isrunning) {
            var obj=this;
            setTimeout(function() {
                obj.loadMoreOutput(this.executionId, 0);
            }, 50);
        }
        return false;
    },
    modifyLastlines: function(val) {
        var oldval = parseInt($('lastlinesvalue').value);
        val = parseInt(val);
        oldval = oldval + val;
        this.updateLastlines(oldval);
    },
    isAppendTop: function() {
        return this.appendtop.value ? true : false;
    },
    setCollapseCtx: function(val) {
        if (this.collapseCtx.value != val) {
            this.collapseCtx.changed = true;
            this.collapseCtx.value = val;
        }

        if (this.collapseCtx.value) {
            this.ctxBodySet._each(Element.hide);
            this.ctxBodyFinalSet._each(this.showFinalLine.value ? Element.show : Element.hide);
            $$('.expandicon').each(function(e) {
                e.addClassName('closed');
                e.removeClassName('opened');
            });
        } else {
            this.ctxBodySet._each(Element.show);
            this.ctxBodyFinalSet._each(Element.show);
            $$('.expandicon').each(function(e) {
                e.removeClassName('closed');
                e.addClassName('opened');
            });
        }
        this.setCtxCollapseDisplay(val);
    },
    setCtxCollapseDisplay:function(val) {
        if ($('ctxcollapseLabel')) {
            if (val) {
                $('ctxcollapseLabel').addClassName('selected');
            } else {
                $('ctxcollapseLabel').removeClassName('selected');
            }
        }
        if ($('ctxshowlastlineoption')) {
            if (val) {
                $('ctxshowlastlineoption').show();
            } else {
                $('ctxshowlastlineoption').hide();
            }
        }
    },

    setGroupOutput:function (val) {
        if (this.groupOutput.value != val) {
            this.groupOutput.value = val;
        }
        this.ctxGroupSet._each(this.groupOutput.value ? Element.show : Element.hide);
        if (this.groupOutput.value && this.collapseCtx.value) {
            this.ctxBodySet._each(Element.hide);
            this.ctxBodyFinalSet._each(this.showFinalLine.value ? Element.show : Element.hide);
        } else {
            this.ctxBodySet._each(Element.show);
            this.ctxBodyFinalSet._each(Element.show);
        }

        if (!this.groupOutput.value) {
            if ($('ctxcollapseLabel')) {
                $('ctxcollapseLabel').hide();
            }
            if ($('ctxshowlastlineoption')) {
                $('ctxshowlastlineoption').hide();
            }

        } else {
            if ($('ctxcollapseLabel')) {
                $('ctxcollapseLabel').show();
            }
            this.setCtxCollapseDisplay(this.collapseCtx.value);
        }
        if ($('ctxshowgroupoption')) {
            if (val) {
                $('ctxshowgroupoption').addClassName('selected');
            } else {
                $('ctxshowgroupoption').removeClassName('selected');
            }
        }
    },
    setShowFinalLine: function(val) {
        if (this.showFinalLine.value != val) {
            this.showFinalLine.changed = true;
            this.showFinalLine.value = val;
        }
        this.ctxBodyFinalSet.each(function(elem, ndx) {
            if (!this.showFinalLine.value && this.collapseCtx.value && this.ctxBodySet[ndx] && !Element.visible(this.ctxBodySet[ndx])) {
                Element.hide(elem);
            } else {
                Element.show(elem);
            }
        });

        if ($('ctxshowlastlineoption')) {
            if (val) {
                $('ctxshowlastlineoption').addClassName('selected');
            } else {
                $('ctxshowlastlineoption').removeClassName('selected');
            }
        }
    },
    setOutputAutoscroll: function(val) {
        this.autoscroll = val;
        if ($('autoscrollTrueLabel')) {
            if (val) {
                $('autoscrollTrueLabel').addClassName('selected');
            } else {
                $('autoscrollTrueLabel').removeClassName('selected');
            }
        }
        if ($('autoscrollFalseLabel')) {
            if (val) {
                $('autoscrollFalseLabel').removeClassName('selected');
            } else {
                $('autoscrollFalseLabel').addClassName('selected');
            }
        }
    },
    setOutputAppendTop: function(istop) {
        if (this.appendtop.value != istop) {
            this.appendtop.changed = !this.appendtop.changed;
        }

        if ($('appendTopLabel')) {

            if (istop) {
                $('appendTopLabel').addClassName('selected');
            } else {
                $('appendTopLabel').removeClassName('selected');
            }
        }
        if ($('appendBottomLabel')) {
            if (istop) {
                $('appendBottomLabel').removeClassName('selected');
            } else {
                $('appendBottomLabel').addClassName('selected');
            }
        }
        this.appendtop.value = istop;

        if (!this.isrunning) {
            this.reverseOutputTable(this.cmdoutputtbl);
        }
    },
    clearTable: function(tbl) {

        if (tbl) {
            $('commandPerform').removeChild(tbl);
            this.cmdoutputtbl = null;
        }
        this.lastTBody = null;
        this.ctxBodySet = new Array();
        this.ctxBodyFinalSet = new Array();
        this.ctxGroupSet = new Array();
        this.runningcmd.count = 0;
        this.runningcmd.entries = new Array();
        this.lastrow = null;
        this.contextIdCounter = 0;
        this.contextStatus = new Object();
    },

    createTable: function() {
        var tbl = $(document.createElement("table"));
        tbl.setAttribute("border", "0");
        tbl.setAttribute("width", "100%");
        tbl.setAttribute("height", "auto");
        tbl.setAttribute("cellSpacing", "0");
        tbl.setAttribute("cellPadding", "0");
        tbl.addClassName('execoutput');
        tbl.setAttribute('id', 'cmdoutputtbl');
        var th = tbl.createTHead();
        var thr1 = th.insertRow(-1);
        var thi = document.createElement("th");
        thi.setAttribute("width", "20px");
        thr1.appendChild(thi);
        var th1 = document.createElement("th");
        th1.innerHTML = "Time";
        thr1.appendChild(th1);
        var th2 = document.createElement("th");
        th2.innerHTML = "Message";
        th2.setAttribute('colspan', '2');
        thr1.appendChild(th2);
        var tbod = document.createElement("tbody");
        tbl.appendChild(tbod);

        $('commandPerform').appendChild(tbl);

        $('commandPerform').show();
        return tbl;
    },
    appendCmdOutput: function(data) {
        var orig = data;
        var needsScroll = false;
        if (!this.isAppendTop() && this.isAtBottom()) {
            needsScroll = true;
        }
        if (this.refresh && this.cmdoutputtbl) {
            try {
                this.clearTable(this.cmdoutputtbl);
            } catch(e) {
                this._log(e);
            }
        }
        if (typeof(data) == "string" && data == "") {
            return;
        }
        try {
            if (typeof(data) == "string") {
                eval("data=" + data);
            }
            if (!this.cmdoutputtbl) {
                this.cmdoutputtbl = this.createTable();
            }
            if (!this.runningcmd) {
                this.runningcmd = new Object();
                this.runningcmd.count = 0;
                this.runningcmd.entries = new Array();
            }
        } catch (e) {
            this.appendCmdOutputError(e);
            return;
        }
        if (data.error) {
            this.appendCmdOutputError(data.error);
            this.finishedExecution();
            return;
        }

        this.runningcmd.id = data.id;
        this.runningcmd.offset = data.dataoffset;
        this.runningcmd.completed = data.iscompleted;
        this.runningcmd.jobcompleted = data.jobcompleted;
        this.runningcmd.jobstatus = data.jobstatus;
        this.runningcmd.jobcancelled = data.jobcancelled;
        this.runningcmd.failednodes = data.failednodes;
        this.runningcmd.percent = data.percentLoaded;
        var entries = $A(data.entries);
        if (null != data.duration) {
            this.updateDuration(data.duration);
        }
        if (entries != null && entries.length > 0) {

            for (var i = 0 ; i < entries.length ; i++) {
                var e = entries[i];
                this.runningcmd.entries.push(e);
                this.genDataRow(e, this.cmdoutputtbl);
            }
        }

        if (needsScroll && this.autoscroll && $('commandPerform')) {
            if (document.body.scrollHeight) {
                window.scrollTo(0, document.body.scrollHeight);
            }
            else if (screen.height) { // IE5
                window.scrollTo(0, screen.height);
            }
        }

        if (this.runningcmd.completed && this.runningcmd.jobcompleted) {
            //halt timer

            if ($('viewoptionscomplete') && null != data.totalsize) {
                if ($('outfilesize')) {
                    $('outfilesize').innerHTML = data.totalsize + " bytes";
                }
                $('viewoptionscomplete').show();
            }
            if ($('taildelaycontrol')) {
                $('taildelaycontrol').hide();
            }
            this.finishDataOutput();
            this.finishedExecution(this.runningcmd.jobstatus == 'true' ? 'true' : this.runningcmd.jobcancelled ? 'cancelled'
                : 'failed');
            return;
        } else {
            var obj=this;
            setTimeout(function() {
                obj.loadMoreOutput(obj.runningcmd.id, obj.runningcmd.offset);
            }, (this.tailmode && this.taildelay > 0) ? this.taildelay * 1000 : 50);
        }
        if (this.runningcmd.jobcompleted && !this.runningcmd.completed) {
            this.jobFinishStatus(this.runningcmd.jobstatus == 'true' ? 'true' : this.runningcmd.jobcancelled ? 'cancelled' : 'failed');
            if ($('progressContainer')) {
                $('progressContainer').hide();
            }
            if ($('fileload')) {
                $('fileload').show();
                $('fileloadpercent').innerHTML = Math.ceil(this.runningcmd.percent) + "%";
            }
            if ($('fileload2')) {
                $('fileload2').show();
                $('fileload2percent').innerHTML = Math.ceil(this.runningcmd.percent) + "%";
            }
        }
        if (this.runningcmd.jobcompleted) {

            if ($('viewoptionscomplete') && null != data.totalsize) {
                if ($('outfilesize')) {
                    $('outfilesize').innerHTML = data.totalsize + " bytes";
                }
                $('viewoptionscomplete').show();
            }
            if ($('taildelaycontrol')) {
                $('taildelaycontrol').hide();
            }
        }

    },
    finishDataOutput: function() {
        if (null == this.lastTBody && null != this.cmdoutputtbl && this.cmdoutputtbl.tBodies.length > 0) {
            this.lastTBody = this.cmdoutputtbl.tBodies[0];
        }
        if (null != this.lastTBody && null != this.lastTBody.getAttribute('id') && this.lastTBody.rows.length > 0) {
            try {
                var lastcell = this.lastTBody.rows[this.isAppendTop() ? 0 : this.lastTBody.rows.length - 1];
                this.lastTBody.removeChild(lastcell);
                var temptbod = document.createElement("tbody");
                temptbod.setAttribute('id', 'final' + this.lastTBody.getAttribute('id'));
                if (this.isAppendTop()) {
                    this.cmdoutputtbl.insertBefore(temptbod, this.lastTBody);
                } else {
                    this.cmdoutputtbl.appendChild(temptbod);
                }

                temptbod.appendChild(lastcell);
                this.ctxBodyFinalSet.push(temptbod);
                if (0 == this.lastTBody.rows.length) {
                    var expicon = $('ctxExp' + this.contextIdCounter);
                    if (expicon) {
                        expicon.removeClassName('expandicon');
                    }
                    var ctxgrp = $('ctxgroup' + this.contextIdCounter);

                    if (ctxgrp && ctxgrp.rows.length > 0) {
                        $(ctxgrp.rows[0]).removeClassName('expandable');
                        $(ctxgrp.rows[0]).removeClassName('action');
                    }
                } else {

                    var ctxgrp = $('ctxgroup' + this.contextIdCounter);

                    if (ctxgrp && ctxgrp.rows.length > 0) {
                        $(ctxgrp.rows[0]).addClassName('expandable');
                        $(ctxgrp.rows[0]).addClassName('action');
                    }
                }
            } catch(e) {
                this.appendCmdOutputError(e);
            }
        }
        try {
            var ctxid = this.ctxBodySet.length - 1;
            if (null != $('ctxIcon' + (ctxid))) {
                var status = this.contextStatus[(ctxid) + ""];
                var iconname = "-small-ok.png";
                if (typeof(status) != "undefined") {
                    iconname = "-small-" + status + ".png";
                }
                var img = document.createElement('img');
                img.setAttribute('alt', '');
                //                 img.setAttribute('title',status);
                img.setAttribute('width', '16');
                img.setAttribute('height', '16');
                img.setAttribute('src', this.iconUrl + iconname);
                img.setAttribute('style', 'vertical-align:center');
                $('ctxIcon' + (ctxid)).appendChild(img);
            }

        } catch(e) {
            this.appendCmdOutputError(e);
        }
    },
    toggleDataBody: function(ctxid) {
        if (Element.visible('databody' + ctxid)) {
            $('databody' + ctxid).hide();
            $('ctxExp' + ctxid).removeClassName('opened');
            $('ctxExp' + ctxid).addClassName('closed');
            if ($('finaldatabody' + ctxid)) {
                if (this.collapseCtx.value && this.showFinalLine.value) {
                    $('finaldatabody' + ctxid).show();
                } else {
                    $('finaldatabody' + ctxid).hide();
                }
            }
        } else {
            $('databody' + ctxid).show();
            $('ctxExp' + ctxid).removeClassName('closed');
            $('ctxExp' + ctxid).addClassName('opened');
            if ($('finaldatabody' + ctxid)) {
                $('finaldatabody' + ctxid).show();
            }
        }


    },
    loadMoreOutput: function(id, offset) {
        return this.loadMoreOutputTail(id, offset);
    },

    loadMoreOutputTail: function(id, offset) {
        var url = this.appLinks.tailExecutionOutput;
        //    $('commandPerform').innerHTML+="id,offset: "+id+","+offset+"; runningcmd: "+this.runningcmd.id+","+this.runningcmd.offset;
        var obj=this;
        new Ajax.Request(url, {
            parameters: "id=" + id + "&offset=" + offset + ((this.tailmode && this.lastlines) ? "&lastlines=" + this.lastlines : "")
                + this.extraParams ,
            onSuccess: function(transport) {
                try{
                obj.appendCmdOutput(transport.responseText);
                }catch(e){
                    obj.appendCmdOutputError(e.stack);
                }
            },
            onFailure: function() {
                obj.appendCmdOutputError("Error performing request: " + url);
                obj.finishedExecution();
            }
        });
    },
    reverseOutputTable: function(tbl) {
        try {
            if (this.appendtop.changed) {
                //reverse table row order for every table body, then reverse order of all table bodies
                for (var j = 0 ; j < tbl.tBodies.length ; j++) {
                    var parent = tbl.tBodies[j];

                    var rows = $A(parent.rows);
                    var len = rows.length;
                    var first = rows[0];

                    for (var i = 1 ; i < len ; i++) {
                        var curNode = rows[len - i];
                        parent.removeChild(curNode);
                        parent.insertBefore(curNode, first);
                    }
                }
                var parent = tbl;
                var len = tbl.tBodies.length;
                var first = tbl.tBodies[0];
                for (var i = 1 ; i < len ; i++) {
                    var curNode = tbl.tBodies[len - 1];
                    parent.removeChild(curNode);
                    parent.insertBefore(curNode, first);
                    if (1 == curNode.rows.length) {
                        var row = curNode.rows[0];
                        if ($(row).hasClassName('contextRow')) {
                            $(row).addClassName(this.isAppendTop() ? "up" : "down");
                            $(row).removeClassName(this.isAppendTop() ? "down" : "up");
                        }
                    }
                }


                this.appendtop.changed = false;
            }
        } catch(e) {
            this.appendCmdOutputError(e);
        }
    },
    isAtBottom: function()
    {
        var a = document.documentElement.scrollHeight || document.body.scrollHeight;
        var b = document.documentElement.scrollTop || document.body.scrollTop;
        var c = document.documentElement.clientHeight || document.body.clientHeight;
        return ((a - b) <= c);
    },
    genDataRowNodes: function(data, tbl) {
        this.reverseOutputTable(tbl);
        var node = data.node;
        if (!node) {
            node = this.execData.node;
        }
        var tbody;
        if (!this.ctxGroupTbodies[node]) {
            tbody = this.createNewNodeTbody(data, tbl, node);
            this.ctxGroupTbodies[node] = tbody;
        } else {
            tbody = this.ctxGroupTbodies[node];
        }

        var tr = $(tbody.insertRow(-1));
        this.configureDataRow(tr, data, node);
        if ($('ctxCount' + node)) {
            $('ctxCount' + node).innerHTML = '' + tbody.rows.length + " lines";
            if (data.level == 'ERROR' || data.level == 'SEVERE') {
                $('ctxCount' + node).addClassName(data.level);
            }
        }
        this.runningcmd.count++;
        this.lastrow = data;
        return tr;
    },
    createNewNodeTbody: function(data, tbl, ctxid) {
        //create new Table body
        var newtbod = $(document.createElement("tbody"));

        newtbod.setAttribute('id', 'ctxgroup' + ctxid);
        if (this.isAppendTop()) {
            tbl.insertBefore(newtbod, tbl.tBodies[0]);
        } else {
            tbl.appendChild(newtbod);
        }
        this.ctxGroupSet.push(newtbod);
        if (!this.groupOutput.value) {
            newtbod.hide();
        }


        var tr = $(newtbod.insertRow(this.isAppendTop() ? 0 : -1));
        var iconcell = $(tr.insertCell(0));
        iconcell.setAttribute('id', 'ctxIcon' + ctxid);
        tr.addClassName('contextRow');
        if (this.isAppendTop()) {
            tr.addClassName("up");
        } else {
            tr.addClassName("down");
        }
        iconcell.addClassName("icon");
        var cell = $(tr.insertCell(1));
        cell.setAttribute('colSpan', '2');


        if (null != data['node'] && 'run' != data['command']) {
            cell.innerHTML +=
            "<span class='node'>" + "<img src='" + AppImages.iconSmallNodeObject + "' width='16' height='16' alt=''/> "
                + data['node'] + "</span>";
        } else if (null != data['node'] && 'run' == data['command']) {
            cell.innerHTML +=
            "<span class='node'>" + "<img src='" + AppImages.iconSmallNodeObject + "' width='16' height='16' alt=''/> "
                + data['node'] + "</span>";
        }

        if (data['command'] || data['module'] || data['context']) {
            if (data['module'] || data['command'] && "run" != data['command']) {
                cell.innerHTML +=
                "<span class='cmdname' title='" + data['command'] + "'>" + data['command'] + "</span>";
            } else if (data['command'] && "run" == data['command']) {
                cell.innerHTML +=
                "<span class='cmdname' title='" + data['command'] + "'>" + data['command'] + "</span>";
            }
            if (data['context']) {
                //split context into project,type,object
                var t = data['context'].split('.');
                if (t.size() > 2) {
                    cell.innerHTML += " <span class='resname'>" + t[2] + "</span>";
                }
                if (t.size() > 1) {
                    cell.innerHTML += " <span class='typename'>" + t[1] + "</span>";
                }
            }
        } else {
            tr.addClassName('console');
            cell.innerHTML += " <span class='console'>[console]</span>";
        }
        var countspan = document.createElement('span');
        countspan.setAttribute('id', 'ctxCount' + ctxid);
        countspan.setAttribute('count', '0');
        countspan.addClassName('ctxcounter');
        countspan.innerHTML = " -";
        cell.appendChild(countspan);
        var cell2 = $(tr.insertCell(2));
        cell2.setAttribute('id', 'ctxExp' + ctxid);
        cell2.addClassName('rowexpicon');
        cell2.addClassName('expandicon');
        var obj=this;
        tr.onclick = function() {
            obj.toggleDataBody(ctxid);
        };

        //create new tablebody for data rows
        var datatbod = $(document.createElement("tbody"));
        datatbod.setAttribute('id', 'databody' + ctxid);
        tbl.appendChild(datatbod);

        //start all data tbody as closed
        Element.hide($(datatbod));
        cell2.addClassName('closed');

        return datatbod;
    },

    createFinalContextTbody: function(data, tbl, ctxid) {
        //remove last row and place in new table body
        try {
            var lastcell = this.lastTBody.rows[this.isAppendTop() ? 0 : this.lastTBody.rows.length - 1];
            this.lastTBody.removeChild(lastcell);
            var temptbod = document.createElement("tbody");
            temptbod.setAttribute('id', 'final' + this.lastTBody.getAttribute('id'));
            if (this.isAppendTop()) {
                tbl.insertBefore(temptbod, this.lastTBody);
            } else {
                tbl.appendChild(temptbod);
            }
            temptbod.appendChild(lastcell);
            this.ctxBodyFinalSet.push(temptbod);
            if (this.showFinalLine.value) {
                Element.show($(temptbod));
            } else if (this.groupOutput.value && this.collapseCtx.value) {
                Element.hide($(temptbod));
            }
            if (0 == this.lastTBody.rows.length) {
                var expicon = $('ctxExp' + this.contextIdCounter);
                if (expicon) {
                    expicon.removeClassName('expandicon');
                }
                var ctxgrp = $('ctxgroup' + this.contextIdCounter);

                if (ctxgrp && ctxgrp.rows.length > 0) {
                    $(ctxgrp.rows[0]).removeClassName('expandable');
                    $(ctxgrp.rows[0]).removeClassName('action');
                }
            } else {

                var ctxgrp = $('ctxgroup' + this.contextIdCounter);

                if (ctxgrp && ctxgrp.rows.length > 0) {
                    $(ctxgrp.rows[0]).addClassName('expandable');
                    $(ctxgrp.rows[0]).addClassName('action');
                }
            }
        } catch(e) {
            this.appendCmdOutputError(e);
        }

        if (null != $('ctxIcon' + (ctxid))) {
            var status = this.contextStatus[(ctxid) + ""];
            var iconname = "-small-ok.png";
            if (typeof(status) != "undefined") {
                iconname = "-small-" + status + ".png";
            }
            var img = document.createElement('img');
            img.setAttribute('alt', '');
            //                 img.setAttribute('title',status);
            img.setAttribute('width', '16');
            img.setAttribute('height', '16');
            img.setAttribute('src', this.iconUrl + iconname);
            img.setAttribute('style', 'vertical-align:center');
            $('ctxIcon' + (ctxid)).appendChild(img);
        }
        this.contextIdCounter++;
    },
    createNewContextTbody: function(data, tbl, ctxid) {
        //create new Table body
        var newtbod = $(document.createElement("tbody"));

        newtbod.setAttribute('id', 'ctxgroup' + ctxid);
        if (this.isAppendTop()) {
            tbl.insertBefore(newtbod, tbl.tBodies[0]);
        } else {
            tbl.appendChild(newtbod);
        }
        this.ctxGroupSet.push(newtbod);
        if (!this.groupOutput.value) {
            newtbod.hide();
        }


        var tr = $(newtbod.insertRow(this.isAppendTop() ? 0 : -1));
        var iconcell = $(tr.insertCell(0));
        iconcell.setAttribute('id', 'ctxIcon' + ctxid);
        tr.addClassName('contextRow');
        if (this.isAppendTop()) {
            tr.addClassName("up");
        } else {
            tr.addClassName("down");
        }
        iconcell.addClassName("icon");
        var cell = $(tr.insertCell(1));
        cell.setAttribute('colSpan', '2');
        //         cell.colSpan=2;


        if (null != data['node'] && 'run' != data['command']) {
            cell.innerHTML +=
            "<span class='node'>" + "<img src='" + AppImages.iconSmallNodeObject + "' width='16' height='16' alt=''/> "
                + data['node'] + "</span>";
        } else if (null != data['node'] && 'run' == data['command']) {
            cell.innerHTML +=
            "<span class='node'>" + "<img src='" + AppImages.iconSmallNodeObject + "' width='16' height='16' alt=''/> "
                + data['node'] + "</span>";
        }

        if (data['command'] || data['module'] || data['context']) {
            if (data['module'] || data['command'] && "run" != data['command']) {
                cell.innerHTML +=
                "<span class='cmdname' title='" + data['command'] + "'>" + data['command'] + "</span>";
            } else if (data['command'] && "run" == data['command']) {
                cell.innerHTML +=
                "<span class='cmdname' title='" + data['command'] + "'>" + data['command'] + "</span>";
            }
            if (data['context']) {
                //split context into project,type,object
                var t = data['context'].split('.');
                if (t.size() > 2) {
                    cell.innerHTML += " <span class='resname'>" + t[2] + "</span>";
                }
                if (t.size() > 1) {
                    cell.innerHTML += " <span class='typename'>" + t[1] + "</span>";
                }
                //                cell.innerHTML+=" <span class='contextInfo'>("+data['context']+") </span>";
            }
        } else {
            tr.addClassName('console');
            cell.innerHTML += " <span class='console'>[console]</span>";
        }
        var cell2 = $(tr.insertCell(2));
        cell2.setAttribute('id', 'ctxExp' + ctxid);
        cell2.addClassName('rowexpicon');
        cell2.addClassName('expandicon');
        var obj=this;
        tr.onclick = function() {
            obj.toggleDataBody(ctxid);
        };

        //create new tablebody for data rows
        var datatbod = $(document.createElement("tbody"));
        if (this.isAppendTop()) {
            tbl.insertBefore(datatbod, newtbod);
        } else {
            tbl.appendChild(datatbod);
        }
        this.lastTBody = datatbod;
        this.lastTBody.setAttribute('id', 'databody' + ctxid);
        this.ctxBodySet.push(this.lastTBody);
        if (this.groupOutput.value && this.collapseCtx.value) {
            Element.hide($(this.lastTBody));
            cell2.addClassName('closed');
        } else {
            cell2.addClassName('opened');
        }
    },

    /**
     * create data row for the table, depending on type of output mode
     * @param data
     * @param tbl
     */
    genDataRow: function(data, tbl) {
        if (this.nodemode) {
            return this.genDataRowNodes(data, tbl);
        } else {
            return this.genDataRowBrowse(data, tbl);
        }
    },

    /**
     * Generate the data row for tail/browse mode
     * @param data
     * @param tbl
     */
    genDataRowBrowse: function(data, tbl) {
        this.reverseOutputTable(tbl);
        var ctxid = this.contextIdCounter;
        if (null == this.lastTBody) {
            this.lastTBody = tbl.tBodies[0];
        }
        if (null == this.lastrow || this.lastrow['module'] != data['module'] || this.lastrow['command'] != data['command']
            || this.lastrow['node'] != data['node'] || this.lastrow['context'] != data['context']) {
            if (null != this.lastrow) {
                this.createFinalContextTbody(data, tbl, ctxid);
            }
            ctxid = this.contextIdCounter;
            this.createNewContextTbody(data, tbl, ctxid);

        }
        var tr = $(this.lastTBody.insertRow(this.isAppendTop() ? 0 : -1));
        this.configureDataRow(tr, data, ctxid);

        this.runningcmd.count++;
        this.lastrow = data;
        return tr;
    },

    configureDataRow: function(tr, data, ctxid) {

        var tdicon = $(tr.insertCell(0));
        tdicon.setAttribute('width', '16');
        tdicon.addClassName('info');
        tdicon.setAttribute('style', 'vertical-align:top');
        if (data.level == 'ERROR' || data.level == 'SEVERE') {
            var img = document.createElement('img');
            img.setAttribute('alt', data.level);
            img.setAttribute('title', data.level);
            img.setAttribute('width', '16');
            img.setAttribute('height', '16');
            img.setAttribute('src', AppImages.iconSmallPrefix + data.level.toLowerCase() + '.png');
            tdicon.appendChild(img);
            this.contextStatus[ctxid] = data.level.toLowerCase();
        }
        var tdtime = $(tr.insertCell(1));
        tdtime.setAttribute('width', '20');
        tdtime.addClassName('info');
        tdtime.addClassName('time');
        tdtime.setAttribute('style', 'vertical-align:top;');
        tdtime.innerHTML = "<span class=\"" + data.level + "\">" + data.time + "</span>";
        var tddata = $(tr.insertCell(2));
        tddata.addClassName('data');
        tddata.setAttribute('style', 'vertical-align:top');
        tddata.setAttribute('colspan', '2');
        if (null != data['mesghtml']) {
            tddata.innerHTML = data.mesghtml;
            tddata.addClassName('datahtml');
        } else {
            var txt = data.mesg;
            txt = txt.replace(/[\\\n\\\r]+$/, '');
            txt = txt.replace(/</g, '&lt;');
            txt = txt.replace(/>/g, '&gt;');
            tddata.innerHTML = txt;
        }
    },
    clearCmdOutput: function() {
        $('commandPerform').innerHTML = '';
        this.cmdoutputtbl = null;
        this.cmdoutspinner = null;
        this.runningcmd = null;

        var d2 = document.createElement("div");
        $(d2).addClassName("commandFlowError");
        $(d2).setAttribute("style", "display: none;");
        $(d2).setAttribute("id", "cmdoutputerror");
        $(d2).hide();

        $('commandPerform').appendChild(d2);
    },
    beginExecution: function() {
        this.clearCmdOutput();
        $('commandPerform').show();

        this.displayCompletion(0);
        $('progressContainer').show();
        this.setOutputAppendTop($F('outputappendtop') == "top");
        this.setOutputAutoscroll($F('outputautoscrolltrue') == "true");
        this.setGroupOutput($F('ctxshowgroup') == 'true');
        this.setCollapseCtx($F('ctxcollapse') == "true");
        this.setShowFinalLine($F('ctxshowlastline') == "true");
        this.isrunning = true;
    },

    finishedExecution: function(result) {
        if ($('cmdoutspinner')) {
            $('cmdoutspinner').remove();
        }
        this.cmdoutspinner = null;
        this.isrunning = false;
        if ($('progressContainer')) {
            this.displayCompletion(100);
            $('progressContainer').hide();
        }
        if ($('fileload')) {
            $('fileload').hide();
        }
        if ($('fileload2')) {
            $('fileload2').hide();
        }
        if (this.runningcmd.failednodes) {
            $('execRetry').show();
        }
        $('execRerun').show();
        this.jobFinishStatus(result);
    },
    jobFinishStatus: function(result) {
        if (null != result && $('runstatus')) {
            $('runstatus').innerHTML = result == 'true' ? '<span class="succeed">Successful</span>'
                : (result == 'cancelled' ? '<span class="fail">Killed</span>' : '<span class="fail">Failed</span>');
            if ($('jobInfo_' + this.executionId)) {
                var img = $('jobInfo_' + this.executionId).down('img');
                if (img) {
                    var status = result == 'true' ? '-ok' : result == 'cancelled' ? '-warn' : '-error';
                    img.src = this.iconUrl + '-job' + status + ".png";
                }
            }
            if (this.updatepagetitle && !/^\[/.test(document.title)) {
                document.title =
                (result == 'true' ? '[OK] ' : result == 'cancelled' ? '[KILLED] ' : '[FAILED] ') + document.title;
            }
            $('cancelresult').hide();
        }
    },
    beginFollowingOutput: function(id) {
        if (this.isrunning) {
            return false;
        }
        this.beginExecution();
        this.starttime = new Date().getTime();
        this.loadMoreOutput(id, 0);
    },

    updatecancel: function(data) {

        var orig = data;
        if (typeof(data) == "string") {
            eval("data=" + data);
        }
        if (data['cancelled']) {
            if ($('cancelresult')) {
                $('cancelresult').loading('Killing Job...');
            }
        } else {
            if ($('cancelresult')) {
                $('cancelresult').innerHTML =
                '<span class="fail">' + (data['error'] ? data['error'] : 'Failed to Kill Job.') + '</span> '
                    + this.killjobhtml;
            }
        }
    },

    docancel: function() {
        if ($('cancelresult')) {
            $('cancelresult').loading('Killing Job...');
        }
        var obj=this;
        new Ajax.Request(this.appLinks.executionCancelExecution, {
            parameters: {id:this.executionId},
            onSuccess: function(transport) {
                obj.updatecancel(transport.responseText);
            },
            onFailure: function(response) {
                obj.updatecancel({error:"Failed to kill Job: " + response.statusText});
            }
        });
    },


    updateDuration: function(duration) {
        if (this.totalCount > 0 && this.totalDuration >= 0 && duration >= 0) {
            var avg = (this.totalDuration / this.totalCount);
            if ($('execDuration')) {
                $('execDuration').innerHTML = duration;
            }
            if ($('avgDuration')) {
                $('avgDuration').innerHTML = avg;
            }

            if (duration < avg) {
                displayCompletion(100 * (duration / avg));
            } else {
                displayCompletion(100);
            }
        } else {
            if ($('execDuration')) {
                $('execDuration').innerHTML = duration;
            }
            if ($('avgDuration')) {
                $('avgDuration').innerHTML = "???";
            }
            $('progressContainer').hide();
        }
    },
    displayCompletion: function(pct) {
        if ($('execDurationPct')) {
            $('execDurationPct').innerHTML = pct + "%";
        }
        $('progressBar').style.width = (Math.floor(pct) * 4);
        $('progressBar').innerHTML = (Math.floor(pct)) + "%";
    }
});
