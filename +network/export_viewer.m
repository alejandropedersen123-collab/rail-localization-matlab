function export_viewer(results,out)
R=results{1}; payload=struct();
root=fileparts(fileparts(mfilename('fullpath')));
payload.schemaVersion=2;
payload.config=R.config;
% The sensor experiment remains separate from ideal network odometry.
sensorFile=fullfile(root,'results_v2','summary.csv');
payload.sensorEvidence=[];
if exist(sensorFile,'file')
    evidence=readtable(sensorFile,'TextType','string');
    payload.sensorEvidence=table2struct(evidence);
end
payload.nodes=table2struct(R.network.nodes); payload.edges=table2struct(R.network.edges);
cases=struct([]);
for k=1:numel(results)
    r=results{k}; vehicles=struct([]);
    for i=1:numel(r.trains)
        vehicle=struct('id',r.trains(i).id,'label',r.trains(i).label, ...
            'direction',r.trains(i).direction,'route',r.trains(i).edges, ...
            'length',r.trains(i).length,'departure',r.trains(i).departure, ...
            'samples',round(squeeze(r.trace(:,i,[1 2 3 4 5 6 7 8 10])),2));
        if isempty(vehicles), vehicles=vehicle; else, vehicles(i)=vehicle; end
    end
    item=struct('id',r.scenario,'time',r.time,'trains',vehicles, ...
        'audit',r.audit,'summary',table2struct(r.summary));
    if isempty(cases), cases=item; else, cases(k)=item; end
end
payload.scenarios=num2cell(cases); % Preserve a JSON array for single-case runs.
template=fileread(fullfile(root,'viewer','template.html'));
template=strrep(template,'__ANALYTICS_JS__',fileread(fullfile(root,'viewer','analytics.js')));
template=strrep(template,'__APP_JS__',fileread(fullfile(root,'viewer','app.js')));
encoded=strrep(jsonencode(payload),'</','<\/');
html=strrep(template,'__NETWORK_DATA__',encoded);
fid=fopen(fullfile(out,'visor.html'),'w','n','UTF-8'); assert(fid>0);
closer=onCleanup(@() fclose(fid)); fprintf(fid,'%s',html);
end
