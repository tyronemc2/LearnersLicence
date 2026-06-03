import { LicenceFamily, OFFICIAL_PRACTICE_RULE_SET } from '../domain/licence.js';

const baseRuleSet = OFFICIAL_PRACTICE_RULE_SET;

export const licenceFamilies: LicenceFamily[] = [
  {
    drivingCodeFamily: 'A1',
    learnerClass: '1',
    displayName: 'Motorcycle up to 125cc',
    minLearnerAge: 16,
    vehicleScope: 'Motorcycles, motor tricycles or quadrucycles up to 125cc',
    jurisdictionNote: 'Maps to LL1 learner class 1 and the A1 driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '1' }
  },
  {
    drivingCodeFamily: 'A',
    learnerClass: '1',
    displayName: 'Motorcycle above 125cc',
    minLearnerAge: 18,
    vehicleScope: 'Motorcycles, motor tricycles or quadrucycles above 125cc',
    jurisdictionNote: 'Maps to LL1 learner class 1 and the A driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '1' }
  },
  {
    drivingCodeFamily: 'B',
    learnerClass: '2',
    displayName: 'Light motor vehicle',
    minLearnerAge: 17,
    vehicleScope: 'Motor vehicles up to 3 500 kg',
    jurisdictionNote: 'Maps to LL1 learner class 2 and the B driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '2' }
  },
  {
    drivingCodeFamily: 'EB',
    learnerClass: '2',
    displayName: 'Light motor vehicle with trailer',
    minLearnerAge: 17,
    vehicleScope: 'Light motor vehicles and typical EB-aligned learner guidance',
    jurisdictionNote: 'Stored as an editable metadata mapping because public guidance can vary.',
    ruleSet: { ...baseRuleSet, learnerClass: '2' }
  },
  {
    drivingCodeFamily: 'C1',
    learnerClass: '3',
    displayName: 'Heavy motor vehicle C1',
    minLearnerAge: 18,
    vehicleScope: 'Heavy motor vehicles above 3 500 kg in the C1 family',
    jurisdictionNote: 'Maps to LL1 learner class 3 and the C1 driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '3' }
  },
  {
    drivingCodeFamily: 'C',
    learnerClass: '3',
    displayName: 'Heavy motor vehicle C',
    minLearnerAge: 18,
    vehicleScope: 'Heavy motor vehicles in the C family',
    jurisdictionNote: 'Maps to LL1 learner class 3 and the C driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '3' }
  },
  {
    drivingCodeFamily: 'EC1',
    learnerClass: '3',
    displayName: 'Articulated heavy motor vehicle EC1',
    minLearnerAge: 18,
    vehicleScope: 'Heavy combination vehicles in the EC1 family',
    jurisdictionNote: 'Maps to LL1 learner class 3 and the EC1 driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '3' }
  },
  {
    drivingCodeFamily: 'EC',
    learnerClass: '3',
    displayName: 'Articulated heavy motor vehicle EC',
    minLearnerAge: 18,
    vehicleScope: 'Heavy combination vehicles in the EC family',
    jurisdictionNote: 'Maps to LL1 learner class 3 and the EC driving code family.',
    ruleSet: { ...baseRuleSet, learnerClass: '3' }
  }
];
