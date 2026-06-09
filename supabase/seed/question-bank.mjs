function q(domain, slug, stem, optionA, optionB, optionC, correct, explanation = '') {
  return {
    official_domain: domain,
    topic_slug: slug,
    stem,
    option_a: optionA,
    option_b: optionB,
    option_c: optionC,
    correct_option: correct,
    explanation
  };
}

const rules = [
  q('rules', 'right-of-way', 'At a four-way stop, who may proceed first?', 'The driver who stopped first', 'The driver on the busiest road', 'The fastest vehicle', 'a', 'At a four-way stop, the first vehicle to stop normally proceeds first.'),
  q('rules', 'roundabouts', 'When approaching a roundabout, you should:', 'Yield to traffic already circulating', 'Enter without slowing if the road is clear ahead', 'Sound your horn and enter quickly', 'a'),
  q('rules', 'pedestrians', 'At a pedestrian crossing, you must:', 'Stop for pedestrians waiting to cross or already crossing', 'Flash your lights and continue if they are still on the pavement', 'Proceed if you are turning right', 'a'),
  q('rules', 'speed-limits', 'In an urban area, unless signs show otherwise, the general speed limit is usually:', '60 km/h', '80 km/h', '100 km/h', 'a'),
  q('rules', 'speed-limits', 'On a public road outside an urban area, unless signs show otherwise, the general speed limit is usually:', '100 km/h', '60 km/h', '120 km/h for all vehicles', 'a'),
  q('rules', 'overtaking', 'You may overtake only when:', 'It is safe and legal to do so', 'The vehicle ahead is travelling below the speed limit', 'You are late for an appointment', 'a'),
  q('rules', 'overtaking', 'You should not overtake:', 'Near a blind rise or bend where visibility is limited', 'On a straight road with clear visibility', 'When the vehicle ahead is turning left with enough space', 'a'),
  q('rules', 'following-distance', 'A safe following distance helps you:', 'Stop in time if the vehicle ahead brakes suddenly', 'Reach your destination faster', 'Prevent others from merging', 'a'),
  q('rules', 'seat-belts', 'Seat belts are important because they:', 'Reduce injury risk in a collision', 'Are only needed on highways', 'Replace the need for careful driving', 'a'),
  q('rules', 'alcohol', 'Driving after drinking alcohol is dangerous because alcohol:', 'Slows reaction time and affects judgement', 'Improves night vision', 'Makes you more alert for a short time only', 'a'),
  q('rules', 'cellphones', 'Using a handheld mobile phone while driving:', 'Distracts you and increases crash risk', 'Is safe if you keep your eyes on the road', 'Is allowed at low speed', 'a'),
  q('rules', 'emergency-vehicles', 'When an emergency vehicle approaches with sirens or flashing lights, you should:', 'Give way safely and lawfully', 'Speed up to clear the lane quickly', 'Ignore it if you are in a queue', 'a'),
  q('rules', 'traffic-lights', 'At a red traffic light, you must:', 'Stop before the stop line or intersection', 'Slow down and proceed if no traffic is visible', 'Stop only if a camera is present', 'a'),
  q('rules', 'traffic-lights', 'A flashing amber traffic light usually means:', 'Proceed with caution', 'Stop immediately', 'The lights are broken so ignore them', 'a'),
  q('rules', 'yield-signs', 'A yield sign requires you to:', 'Give way to crossing or approaching traffic', 'Stop in every case', 'Accelerate to merge', 'a'),
  q('rules', 'stop-signs', 'At a stop sign, you must:', 'Come to a complete stop', 'Slow down to walking pace', 'Stop only if other traffic is visible', 'a'),
  q('rules', 'uncontrolled-intersection', 'At an uncontrolled intersection, you should:', 'Approach carefully and give way as required', 'Assume you always have right of way', 'Sound your horn and drive through', 'a'),
  q('rules', 'school-zones', 'Near schools, you should:', 'Reduce speed and watch for children', 'Use your hooter to warn pedestrians', 'Overtake stopped school transport quickly', 'a'),
  q('rules', 'railway-crossings', 'At a railway level crossing with no barrier, you should:', 'Stop, look and listen before crossing if required', 'Cross quickly without looking', 'Follow closely behind another vehicle', 'a'),
  q('rules', 'parking', 'You should not park:', 'Where you block traffic or obscure visibility', 'In a marked parking bay', 'Off the roadway in an emergency', 'a'),
  q('rules', 'headlights', 'You should use headlights at night because they:', 'Help you see and be seen', 'Are only for highways', 'Replace the need to reduce speed', 'a'),
  q('rules', 'fatigue', 'If you feel tired while driving, the safest action is to:', 'Rest before continuing', 'Open the window and keep driving', 'Drink coffee and speed up', 'a'),
  q('rules', 'passengers', 'Before moving off, a responsible driver should ensure:', 'Passengers are seated and doors are closed', 'Everyone is standing for a better view', 'Children are not buckled if the trip is short', 'a'),
  q('rules', 'lane-discipline', 'You should keep to the left lane on a multi-lane road unless:', 'You are overtaking or the road layout requires otherwise', 'You want to block faster traffic', 'You are travelling slowly in the right lane', 'a'),
  q('rules', 'turning', 'Before turning, you should:', 'Signal in good time and check mirrors and blind spots', 'Turn without signalling if no cars are visible', 'Brake suddenly after turning', 'a'),
  q('rules', 'reverse', 'When reversing, you should:', 'Reverse slowly and check all around', 'Reverse quickly to save time', 'Rely only on mirrors without looking back', 'a'),
  q('rules', 'accidents', 'After a minor collision with no injuries, you should:', 'Exchange details and move vehicles if safe and lawful', 'Leave immediately without stopping', 'Argue in the traffic lane', 'a'),
  q('rules', 'documents', 'A learner driver should carry relevant learner documentation because:', 'It may be requested by traffic authorities', 'It replaces the need to practise', 'It allows speeding on practice drives', 'a')
];

const signs = [
  q('signs', 'warning-triangle', 'A triangular sign with a red border is usually:', 'A warning sign', 'A parking sign', 'An information sign for services', 'a'),
  q('signs', 'regulatory-circle', 'A circular sign with a red border is usually:', 'A regulatory or prohibition sign', 'A tourist sign', 'A direction sign', 'a'),
  q('signs', 'stop-sign-shape', 'The shape of a STOP sign is:', 'Octagonal', 'Triangular', 'Circular', 'a'),
  q('signs', 'yield-sign-shape', 'The shape of a yield sign is usually:', 'Triangular point down', 'Rectangular', 'Round blue', 'a'),
  q('signs', 'speed-limit', 'A sign showing "60" in a red circle means:', 'Maximum speed 60 km/h', 'Minimum speed 60 km/h', 'Distance 60 km', 'a'),
  q('signs', 'no-entry', 'A white horizontal bar on a red circle usually means:', 'No entry', 'No stopping', 'Hospital ahead', 'a'),
  q('signs', 'one-way', 'A blue sign with a white arrow usually indicates:', 'One-way or compulsory direction', 'No overtaking', 'Roadworks', 'a'),
  q('signs', 'pedestrian-crossing', 'A sign showing pedestrians usually warns of:', 'A pedestrian crossing ahead', 'A playground only', 'A bus stop only', 'a'),
  q('signs', 'school', 'A sign showing children usually warns of:', 'A school zone or children crossing', 'A sports field only', 'A pedestrian mall', 'a'),
  q('signs', 'curve', 'A sign showing a curved arrow warns of:', 'A bend or curve ahead', 'A dead end', 'A steep hill only', 'a'),
  q('signs', 'slippery', 'A sign showing a skidding vehicle warns of:', 'Slippery road conditions', 'Racing area', 'Car wash ahead', 'a'),
  q('signs', 'railway', 'A crossbuck or railway warning sign means:', 'Railway crossing ahead', 'Level crossing closed permanently', 'No trains in this area', 'a'),
  q('signs', 'roadworks', 'An orange diamond-shaped sign usually indicates:', 'Roadworks or temporary hazard', 'Parking area', 'Scenic route', 'a'),
  q('signs', 'no-overtaking', 'Two cars shown with a red line between them usually means:', 'No overtaking', 'Overtaking permitted', 'Two-way traffic', 'a'),
  q('signs', 'no-parking', 'A red circle with a blue background and one red diagonal line often means:', 'No parking', 'No entry', 'No U-turn', 'a'),
  q('signs', 'information', 'A rectangular green sign on a freeway often gives:', 'Direction or guidance information', 'A prohibition', 'A warning of animals', 'a'),
  q('signs', 'chevron', 'Chevron boards on a sharp bend help you to:', 'See the direction of the curve', 'Know the speed limit', 'Find parking', 'a'),
  q('signs', 'stop-line', 'A solid white stop line at an intersection means:', 'Stop before or at this line when required', 'Speed up to clear the junction', 'Park here', 'a'),
  q('signs', 'yield-line', 'A broken yield line usually means:', 'Give way at this point if required', 'No stopping zone', 'Bus lane', 'a'),
  q('signs', 'lane-markings', 'A solid white line between lanes usually means:', 'Lane changing is discouraged or prohibited', 'You may cross freely at any time', 'Parking is allowed', 'a'),
  q('signs', 'yellow-center-line', 'A yellow line on your side of the road centre often means:', 'No crossing to overtake', 'Passing is encouraged', 'Parking bay', 'a'),
  q('signs', 'arrows-on-road', 'White arrows painted on the road show:', 'The direction traffic must follow in that lane', 'Recommended parking angle', 'Pedestrian-only area', 'a'),
  q('signs', 'zebra-crossing', 'White stripes across the road usually mark:', 'A pedestrian crossing', 'A speed hump only', 'A railway line', 'a'),
  q('signs', 'traffic-signal-ahead', 'A sign showing traffic lights ahead warns you to:', 'Prepare to stop or proceed safely at signals', 'Ignore signals', 'Turn immediately', 'a'),
  q('signs', 'animal-warning', 'A sign showing an animal warns of:', 'Animals that may be on or near the road', 'A zoo entrance only', 'Hunting area', 'a'),
  q('signs', 'falling-rocks', 'A sign showing rocks falling warns of:', 'Possible rockfalls or debris on the road', 'Quarry sales', 'Steep descent only', 'a'),
  q('signs', 'intersection', 'A sign showing a cross or T-junction warns of:', 'An intersection ahead', 'Railway station', 'Hospital', 'a'),
  q('signs', 'dual-carriageway', 'Signs showing two arrows in opposite directions may warn of:', 'Two-way traffic or dual carriageway conditions', 'No entry', 'One-way street', 'a')
];

const controlsClass1 = [
  q('controls', 'motorcycle-brakes', 'On a motorcycle, the front brake generally provides:', 'A large share of stopping power when used properly', 'No stopping power at all', 'Only parking hold', 'a'),
  q('controls', 'motorcycle-throttle', 'The throttle on a motorcycle controls:', 'Engine speed and power', 'Only the headlight', 'The horn volume', 'a'),
  q('controls', 'motorcycle-clutch', 'The clutch lever is used to:', 'Disconnect drive while changing gear or stopping smoothly', 'Apply the rear brake only', 'Open the fuel cap', 'a'),
  q('controls', 'motorcycle-helmet', 'A properly fastened helmet helps to:', 'Protect the head in a crash', 'Replace safe riding', 'Improve engine cooling', 'a'),
  q('controls', 'motorcycle-mirrors', 'Before changing lanes on a motorcycle, check mirrors and:', 'Blind spots by looking over your shoulder', 'Only the speedometer', 'The licence disc', 'a'),
  q('controls', 'motorcycle-lights', 'Before riding at night, you should check that:', 'Lights and indicators work', 'Only the horn works', 'The chain is painted', 'a'),
  q('controls', 'motorcycle-gear', 'Selecting the correct gear helps you to:', 'Control speed and engine response safely', 'Drive without using brakes', 'Ignore road conditions', 'a'),
  q('controls', 'motorcycle-stand', 'The side stand should be:', 'Fully up and secure before riding', 'Left down while riding slowly', 'Used instead of the brake', 'a')
];

const controlsClass2 = [
  q('controls', 'brake-pedal', 'In a light motor vehicle, the brake pedal is used to:', 'Slow down or stop the vehicle', 'Increase engine speed', 'Change direction only', 'a'),
  q('controls', 'accelerator', 'The accelerator pedal controls:', 'Engine power and speed', 'Windscreen wipers', 'Indicator timing', 'a'),
  q('controls', 'clutch', 'The clutch pedal is used in manual vehicles to:', 'Change gears smoothly', 'Steer the vehicle', 'Operate the hooter', 'a'),
  q('controls', 'handbrake', 'The parking brake is used to:', 'Hold the vehicle when parked', 'Replace foot brakes while driving', 'Increase acceleration', 'a'),
  q('controls', 'indicators', 'Indicators should be used to:', 'Show your intention to turn or change lanes', 'Thank other drivers', 'Warn pedestrians only', 'a'),
  q('controls', 'mirrors', 'Interior and exterior mirrors help you to:', 'See traffic behind and beside you', 'Replace looking ahead', 'Measure tyre pressure', 'a'),
  q('controls', 'headlight-dip', 'Dipping headlights at night helps to:', 'Avoid dazzling other road users', 'Hide your vehicle', 'Save brake pads', 'a'),
  q('controls', 'seat-position', 'A correct driving position helps you to:', 'Reach controls comfortably and see clearly', 'Drive with one hand only', 'Rest your feet on the dashboard', 'a')
];

const controlsClass3 = [
  q('controls', 'heavy-braking', 'In a heavy vehicle, braking distance is generally:', 'Longer than for a light vehicle', 'Shorter than for a motorcycle', 'Unaffected by load', 'a'),
  q('controls', 'heavy-mirrors', 'Large mirrors on heavy vehicles are especially important because:', 'Blind spots are larger', 'They replace signalling', 'They cool the engine', 'a'),
  q('controls', 'heavy-gears', 'Using the correct gear on a heavy vehicle helps to:', 'Control speed on inclines safely', 'Avoid using mirrors', 'Drive faster in towns', 'a'),
  q('controls', 'heavy-load', 'An increased load affects stopping because:', 'More momentum must be controlled', 'Brakes become stronger automatically', 'Tyres need no checking', 'a'),
  q('controls', 'air-pressure', 'On vehicles with air brakes, low air pressure warnings mean:', 'Brakes may not work reliably until corrected', 'You should speed up', 'Parking brake is optional', 'a'),
  q('controls', 'heavy-signals', 'Before reversing a long vehicle, you should:', 'Check all around and use signals if needed', 'Reverse quickly', 'Rely only on passengers', 'a'),
  q('controls', 'engine-brake', 'Using engine braking on long descents can help to:', 'Reduce brake overheating', 'Turn off the headlights', 'Increase tyre wear unnecessarily', 'a'),
  q('controls', 'coupling-check', 'Before towing with an articulated combination, check:', 'Coupling, lights and brake connections', 'Only the radio', 'Paint colour match', 'a')
];

export const questionsByLearnerClass = {
  '1': [...rules, ...signs, ...controlsClass1],
  '2': [...rules, ...signs, ...controlsClass2],
  '3': [...rules, ...signs, ...controlsClass3]
};
