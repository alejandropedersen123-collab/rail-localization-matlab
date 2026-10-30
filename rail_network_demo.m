function results=rail_network_demo(outputDir,options)
% Eight-train Madrid-Andalucia simulation. MATLAB base only.
% Infrastructure provenance: docs/REAL_DATA.md. Traffic is synthetic.
root=fileparts(mfilename('fullpath'));
if nargin<1 || isempty(outputDir), outputDir=fullfile(root,'results_network'); end
if nargin<2, options=struct(); end
if ~exist(outputDir,'dir'), mkdir(outputDir); end
c=network.config();
if isfield(options,'dt'), c.dt=options.dt; end
if isfield(options,'maxTime'), c.maxTime=options.maxTime; end
validateattributes(c.dt,{'numeric'},{'scalar','positive','finite'});
validateattributes(c.maxTime,{'numeric'},{'scalar','positive','finite'});
assert(abs(c.sampleSeconds/c.dt-round(c.sampleSeconds/c.dt))<1e-9);
net=network.infrastructure(c); trains=network.timetable(net,c);
scenarios={'nominal','signal_outage','station_delay'};
if isfield(options,'scenarios'), scenarios=options.scenarios; end
assert(iscellstr(scenarios) && ~isempty(scenarios),'Supply a nonempty cell array of scenario names.');
results=cell(numel(scenarios),1);
for j=1:numel(scenarios)
    assert(ismember(scenarios{j},{'nominal','signal_outage','station_delay'}));
    R=network.simulate(net,trains,c,scenarios{j});
    results{j}=R; folder=fullfile(outputDir,scenarios{j});
    if ~exist(folder,'dir'), mkdir(folder); end
    writetable(R.summary,fullfile(folder,'trains.csv'));
    writetable(struct2table(R.audit),fullfile(folder,'audit.csv'));
    if ~isempty(R.stationRecords)
        writetable(cell2table(R.stationRecords,'VariableNames', ...
            {'Scenario','Train','Station','Arrival_s','Dwell_s'}),fullfile(folder,'stops.csv'));
    end
    records=zeros(numel(R.time)*8,13);
    for i=1:8
        range=(i-1)*numel(R.time)+(1:numel(R.time));
        records(range,:)=[R.time,repmat(i,numel(R.time),1),squeeze(R.trace(:,i,:))];
    end
    writetable(array2table(records,'VariableNames',[{'Time_s','TrainID'},R.fields]), ...
        fullfile(folder,'traces.csv'));
    fprintf('%s: %d/8 complete, %d simultaneous, conflicts=%d, authority violations=%d, speed violations=%d\n', ...
        R.scenario,R.audit.Completed,R.audit.MaximumActive,R.audit.BlockConflicts, ...
        R.audit.AuthorityViolations,R.audit.SpeedLimitViolations);
end
writetable(net.nodes,fullfile(outputDir,'nodes.csv'));
writetable(net.edges,fullfile(outputDir,'edges.csv'));
save(fullfile(outputDir,'network_results.mat'),'results');
makePlots=~isfield(options,'makePlots') || options.makePlots;
if makePlots, network.plot_results(results,outputDir); end
network.export_viewer(results,outputDir);
end
