"""Independent harness checks: no holdout target leakage and reproducibility."""
import copy
import math
import unittest
import numpy as np
import challenge_ded as m

class TestFalsification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows,cls.existing=m.load()

    def test_source_hashes_and_tracks(self):
        self.assertEqual(len(self.rows),23)
        self.assertEqual(sum(int(x["aligned_ir_frames"]) for x in self.rows),4905)
        self.assertEqual(len({x["powder_flow_cmd_g_min"] for x in self.rows}),5)

    def test_independent_fixed_ridge_recovers_known_metrics(self):
        recipe,_=m.cv(self.rows,"recipe-linear","powder_flow_cmd_g_min",False)
        with_ir,_=m.cv(self.rows,"recipe-ir","powder_flow_cmd_g_min",False)
        y=np.array([r["bead_width_mm"] for r in self.rows])
        self.assertAlmostEqual(m.metrics(y,recipe)["rmseMm"],
            self.existing["primary"]["recipeOnly"]["rmseMm"],places=10)
        self.assertAlmostEqual(m.metrics(y,with_ir)["rmseMm"],
            self.existing["primary"]["recipePlusIr"]["rmseMm"],places=10)

    def test_nested_scaling_and_tuning_do_not_read_outer_holdout_target(self):
        base,_=m.cv(self.rows,"recipe-poly","powder_flow_cmd_g_min",True)
        changed=copy.deepcopy(self.rows)
        held=2.0
        indices=[i for i,r in enumerate(changed) if r["powder_flow_cmd_g_min"]==held]
        self.assertGreater(len(indices),0)
        for i in indices:
            changed[i]["bead_width_mm"]+=100.0
        updated,_=m.cv(changed,"recipe-poly","powder_flow_cmd_g_min",True)
        np.testing.assert_allclose(updated[indices],base[indices],rtol=0,atol=1e-10)

    def test_permutation_preserves_recipe_speed_groups_and_ir_pairs(self):
        rng=np.random.default_rng(m.SEED)
        ir=m.permute_ir(self.rows,rng)
        for speed in {r["speed_cmd_mm_s"] for r in self.rows}:
            ids=[i for i,r in enumerate(self.rows) if r["speed_cmd_mm_s"]==speed]
            original=sorted((self.rows[i]["ir_diameter50_median_px"],
                             self.rows[i]["ir_intensity_sum_median"]) for i in ids)
            randomized=sorted(tuple(ir[i]) for i in ids)
            self.assertEqual(original,randomized)

    def test_group_bootstrap_is_deterministic_and_five_cluster_only(self):
        y=np.array([r["bead_width_mm"] for r in self.rows])
        a=m.bootstrap(self.rows,y+0.1,y)
        b=m.bootstrap(self.rows,y+0.1,y)
        self.assertEqual(a,b)
        self.assertEqual(a["clusters"],5)
        self.assertEqual(a["draws"],10000)
        self.assertLess(a["ci95GroupMeanMseDifferenceMm2"][1],0)

    def test_reported_stronger_comparator_and_conclusions(self):
        import json
        result=json.loads((m.HERE/"RESULTS.json").read_text())
        fixed=result["primary"]["models"]["recipe-ir:fixed"]["metrics"]["rmseMm"]
        stronger=result["primary"]["models"]["recipe-poly:nested"]["metrics"]["rmseMm"]
        self.assertAlmostEqual(fixed,0.42785748024260306,places=8)
        self.assertAlmostEqual(stronger,0.38677268634346473,places=8)
        self.assertLess(stronger,fixed)
        self.assertFalse(result["gate"]["H1_irNovelImprovementSupported"])
        self.assertFalse(result["gate"]["H2_unseenSpeedGeneralizationSupported"])
        self.assertFalse(result["gate"]["scientificNoveltyEstablished"])
        self.assertAlmostEqual(result["conditionalIrPermutation"]["pOneSided"],0.184,places=6)
        self.assertEqual(result["input"]["trackCount"],23)

    def test_mean_model_is_train_only(self):
        pred,_=m.cv(self.rows,"mean","powder_flow_cmd_g_min")
        g=6
        ix=[i for i,r in enumerate(self.rows) if r["powder_flow_cmd_g_min"]==g]
        training=[r["bead_width_mm"] for r in self.rows if r["powder_flow_cmd_g_min"]!=g]
        self.assertGreater(len(ix),0)
        for i in ix:
            self.assertAlmostEqual(pred[i],sum(training)/len(training),places=12)

if __name__=="__main__":
    unittest.main()
