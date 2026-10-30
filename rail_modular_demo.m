function results = rail_modular_demo(outputDir,nRuns,options)
% RAIL_MODULAR_DEMO v2. Synthetic research, no railway equipment interfaces.
% results=rail_modular_demo; MATLAB base only. See LEEME.txt for limitations.
if nargin<1 || isempty(outputDir), outputDir=fullfile(fileparts(mfilename('fullpath')),'results_v2'); end
if nargin<2, nRuns=30; end
if nargin<3, options=struct(); end
validateattributes(nRuns,{'numeric'},{'scalar','integer','positive'});
if ~exist(outputDir,'dir'), mkdir(outputDir); end
c=rail.default_config();
if isfield(options,'sensorFn'), c.sensorFn=options.sensorFn; end
makePlots=true; if isfield(options,'makePlots'), makePlots=options.makePlots; end
scenarios=rail.scenarios(); architectures=rail.architectures();
checks=rail.selftest(c);
records=struct([]); examples=cell(numel(scenarios),numel(architectures),2);
for j=1:numel(scenarios)
    sc=scenarios(j);
    for r=1:nRuns
        noise=rail.noise(c,sc,1000+r);
        for a=1:numel(architectures)
            ar=architectures(a);
            replay=rail.simulate(c,sc,noise,ar,false);
            closed=rail.simulate(c,sc,noise,ar,true);
            rec=rail.evaluate(c,sc,ar,replay,closed,r);
            if isempty(records), records=rec; else, records(end+1)=rec; end %#ok<AGROW>
            if r==1
                examples{j,a,1}=replay; examples{j,a,2}=closed;
                writetable(struct2table(replay),fullfile(outputDir,sprintf('scenario_%02d_arch_%d_replay.csv',j,a)));
                writetable(struct2table(closed),fullfile(outputDir,sprintf('scenario_%02d_arch_%d_closed.csv',j,a)));
            end
        end
    end
    fprintf('Completed %d/%d: %s\n',j,numel(scenarios),sc.name);
end
trials=struct2table(records); summary=rail.summarize(trials);
assert(all(trials.MinCovEigenvalue>-1e-8),'Non-positive-semidefinite covariance');
assert(all(isfinite(trials.OpenRMSE_m)),'Non-finite estimates');
assert(all(trials.ClosedFinalSpeed_mps>=0),'Reverse motion after stopping');
paired=reshape(trials.ReplaySensorChecksum,4,[]);
assert(all(all(paired==paired(1,:))),'Replay observations differ between architectures');
writetable(trials,fullfile(outputDir,'trials.csv'));
writetable(summary,fullfile(outputDir,'summary.csv'));
writetable(struct2table(scenarios),fullfile(outputDir,'scenarios.csv'));
effects=rail.factor_effects(summary); writetable(effects,fullfile(outputDir,'factor_effects.csv'));
writetable(checks,fullfile(outputDir,'checks.csv'));
results=struct('version','2.0','config',c,'scenarios',scenarios,'architectures',architectures, ...
    'summary',summary,'trials',trials,'effects',effects,'examples',{examples}, ...
    'matlabVersion',version,'runsPerScenario',nRuns,'checks',checks);
if makePlots, rail.plot_results(results,outputDir); end
rail.write_report(results,outputDir);
save(fullfile(outputDir,'rail_results.mat'),'results');
fprintf('PASS: %d scenario/seed fixtures, %d paired architecture trials, %d simulations (replay + closed loop).\n', ...
    numel(scenarios)*nRuns,height(trials),2*height(trials));
fprintf('Synthetic model only; no certified protection level, reliability or accident-prevention claim.\n');
disp(summary(:,{'Scenario','Architecture','OpenRMSE_m','ClosedCollisionTrials','NoObstacleBrakeTrials'}));
end
