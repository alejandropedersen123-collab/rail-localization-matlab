function validate_configurable
% Reference fixtures for the browser engine and portable configuration checks.
root=fileparts(mfilename('fullpath')); out=fullfile(root,'results_configurable');
if ~exist(out,'dir'), mkdir(out); end
files={'regional-iberico','regional-metrico','metro-anillo'}; fixtures=cell(3,1);
for k=1:numel(files)
    p=network.load_project(fullfile(root,'networks',[files{k} '.json']));
    [n,t,c]=network.compile_project(p); r=network.simulate(n,t,c,'nominal');
    assert(r.audit.Completed==numel(t));
    assert(r.audit.BlockConflicts+r.audit.AuthorityViolations+r.audit.SpeedLimitViolations==0);
    vehicles=cell(numel(t),1);
    for i=1:numel(t)
        vehicles{i}=struct('id',t(i).id,'samples',{num2cell(reshape(r.trace(:,i,[1 2 3 4 5 6 7 8]),numel(r.time),8),2)});
    end
    fixtures{k}=struct('id',p.id,'time',{num2cell(r.time)},'trains',{vehicles}, ...
        'summary',{num2cell(table2struct(r.summary))},'audit',r.audit);
    writetable(r.summary,fullfile(out,[files{k} '-trains.csv']));
    writetable(struct2table(r.audit),fullfile(out,[files{k} '-audit.csv']));
    fprintf('%s: %d complete, zero model violations\n',p.id,r.audit.Completed);
end
fid=fopen(fullfile(out,'matlab-reference.json'),'w'); assert(fid>0);
fprintf(fid,'%s',jsonencode(fixtures)); fclose(fid);

p=network.load_project(fullfile(root,'networks','regional-metrico.json'));
bad=p; bad.trains(1).gauge_mm=1435; rejected(bad);
bad=p; bad.trains(1).route=[1 3]; rejected(bad);
bad=p; bad.trains(1).route=[1 -1 1 -2 3]; rejected(bad);
bad=p; bad.trains(1).length_m=1000; rejected(bad);
bad=p; bad.gpsFaults(1).edge=99; rejected(bad);

% MATLAB must keep singleton lists as JSON arrays and a 1x1x11 trace exportable.
p.nodes=p.nodes(1:2); p.edges=p.edges(1); p.trains=p.trains(1);
p.trains.route=1; p.trains.stops=p.trains.stops(1); p.trains.stops.node=2;
p.analysisRoute=1; p.gpsFaults=struct([]); p.parameters.duration_s=1;
folder=fullfile(root,'.validation','singleton');
rail_network_demo(folder,struct('project',p,'scenarios',{{'nominal'}},'makePlots',false));
html=fileread(fullfile(folder,'visor.html'));
embedded=regexp(html,'<script id="data" type="application/json">(.*?)</script>','tokens','once');
fid=fopen(fullfile(out,'singleton-export.json'),'w'); assert(fid>0);
fprintf(fid,'%s',embedded{1}); fclose(fid);
fprintf('Rejected invalid gauge, path, repeated edge, holding length and GPS edge; singleton export passed.\n');
end

function rejected(p)
failed=false;
try, network.load_project(p); catch, failed=true; end
assert(failed,'Invalid project was accepted.');
end
