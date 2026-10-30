function export_viewer(results,out)
R=results{1}; payload=struct();
root=fileparts(fileparts(mfilename('fullpath')));
payload.schemaVersion=3;
payload.config=R.config;
if isfield(R.network,'project'), payload.project=R.network.project;
else, payload.project=network.load_project(fullfile(root,'networks','madrid-andalucia.json')); end
payload.project=network.json_project(payload.project);
files={'madrid-andalucia','regional-iberico','regional-metrico','metro-anillo'};
payload.examples=cell(numel(files),1);
for j=1:numel(files)
    payload.examples{j}=network.json_project(network.load_project(fullfile(root,'networks',[files{j} '.json'])));
end
% The sensor experiment remains separate from ideal network odometry.
sensorFile=fullfile(root,'results_v2','summary.csv');
payload.sensorEvidence=[];
if exist(sensorFile,'file')
    evidence=readtable(sensorFile,'TextType','string');
    payload.sensorEvidence=table2struct(evidence);
end
payload.nodes=num2cell(table2struct(R.network.nodes)); payload.edges=num2cell(table2struct(R.network.edges));
cases=struct([]);
for k=1:numel(results)
    r=results{k}; vehicles=struct([]);
    for i=1:numel(r.trains)
        vehicle=struct('id',r.trains(i).id,'label',r.trains(i).label, ...
            'direction',r.trains(i).direction,'route',{num2cell(r.trains(i).edges)}, ...
            'length',r.trains(i).length,'trainLength',r.trains(i).trainLength,'departure',r.trains(i).departure, ...
            'samples',{num2cell(round(reshape(r.trace(:,i,[1 2 3 4 5 6 7 8 10]),numel(r.time),9),2),2)});
        if isfield(r.trains(i),'edgeDirections')
            values=cell2mat(vehicle.samples); dirs=zeros(numel(r.time),1);
            for sample=1:numel(r.time)
                leg=find(r.trains(i).edges==values(sample,7),1); dirs(sample)=r.trains(i).edgeDirections(leg);
            end
            vehicle.samples=num2cell([values dirs],2);
        end
        if isempty(vehicles), vehicles=vehicle; else, vehicles(i)=vehicle; end
    end
    item=struct('id',r.scenario,'time',{num2cell(r.time)},'trains',{num2cell(vehicles)}, ...
        'audit',r.audit,'summary',{num2cell(table2struct(r.summary))});
    if isempty(cases), cases=item; else, cases(k)=item; end
end
payload.scenarios=num2cell(cases); % Preserve a JSON array for single-case runs.
template=fileread(fullfile(root,'viewer','template.html'));
template=strrep(template,'__ANALYTICS_JS__',fileread(fullfile(root,'viewer','analytics.js')));
template=strrep(template,'__ENGINE_JS__',fileread(fullfile(root,'viewer','network-engine.js')));
template=strrep(template,'__APP_JS__',fileread(fullfile(root,'viewer','app.js')));
encoded=strrep(jsonencode(payload),'</','<\/');
html=strrep(template,'__NETWORK_DATA__',encoded);
fid=fopen(fullfile(out,'visor.html'),'w','n','UTF-8'); assert(fid>0);
closer=onCleanup(@() fclose(fid)); fprintf(fid,'%s',html);
end
