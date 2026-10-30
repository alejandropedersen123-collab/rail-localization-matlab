function comparison=compare_sensor_module(baseResults,outputDir)
% Repeat all scenarios for seed 1001 with one sensor module replaced.
root=fileparts(mfilename('fullpath'));
if nargin<1 || isempty(baseResults)
    saved=load(fullfile(root,'results_v2','rail_results.mat'),'results');
    baseResults=saved.results;
end
if nargin<2, outputDir=fullfile(root,'results_v2_no_ranges'); end
options=struct('sensorFn',@rail.sensor_without_ranges,'makePlots',false);
alternative=rail_modular_demo(outputDir,1,options);
B=baseResults.trials(baseResults.trials.Run==1,:); A=alternative.trials;
assert(isequal(B.ScenarioID,A.ScenarioID) && isequal(B.Architecture,A.Architecture));
% GPS does not consume ranges: all its estimates must remain exactly equal.
for j=1:numel(baseResults.scenarios)
    for a=1:2
        for mode=1:2
            before=baseResults.examples{j,a,mode}; after=alternative.examples{j,a,mode};
            assert(isequal(before.estimate,after.estimate));
            assert(isequal(before.truth,after.truth));
        end
    end
end
comparison=table(B.Scenario,B.Architecture,B.OpenRMSE_m,A.OpenRMSE_m, ...
    A.OpenRMSE_m-B.OpenRMSE_m,B.ClosedCollision,A.ClosedCollision, ...
    'VariableNames',{'Scenario','Architecture','FullSensorRMSE_m','NoRangesRMSE_m', ...
    'DeltaRMSE_m','FullSensorCrossing','NoRangesCrossing'});
assert(any(abs(comparison.DeltaRMSE_m(B.Fusion))>1e-9),'Fusion did not react to module substitution');
writetable(comparison,fullfile(outputDir,'module_comparison.csv'));
fprintf('PASS: replacement repeated all %d scenarios, four architectures, seed 1001. GPS outputs unchanged.\n', ...
    numel(baseResults.scenarios));
end
