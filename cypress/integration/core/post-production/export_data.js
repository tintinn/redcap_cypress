const pid = 13

describe('Export Data', () => {

	before(() => {
		// Prepare project
		cy.set_user_type('admin')
		cy.mysql_db('projects/pristine')
		// Upload data dictionary
		cy.upload_data_dictionary('core/21_ExportDataExtraction_v913DD.csv', pid)
		// Enable survey instrument as survey
		cy.visit_version({page:'Design/online_designer.php', params:`pid=${pid}`})
		cy.get('div#form_menu_description_input_span-survey')
			.closest('tr')
			.find('button')
			.contains('Enable')
			.click()
		cy.get('button#surveySettingsSubmit').click()
		// Add Event 2 and designate instruments
		cy.visit_version({page:'Design/define_events.php', params:`pid=${pid}`})
		cy.get('input#descrip').type('Event 2')
		cy.get('input#addbutton').click()
		cy.visit_version({page:'Design/designate_forms.php', params:`pid=${pid}`})
		cy.get('button').contains('Begin Editing').click()
		cy.get('td').contains('Survey').closest('tr').find('input').last().check()
		cy.get('button#save_btn').click()
		// Enable repeatable instruments
		cy.visit_version({page:'ProjectSetup/index.php', params:`pid=${pid}`})
		cy.get('button#enableRepeatingFormsEventsBtn').click()
		cy.get('div.repeat_event_label').contains('Event 2').closest('tr')
			.find('select.repeat_select').select('PARTIAL')
			.closest('tr').find('input.repeat_form_chkbox').check()
		cy.get('button').contains('Save').click()
		// Import data file
		cy.access_api_token(pid, Cypress.env('users')['admin']['user']).then(($token) => {
			cy.import_data_file("21_ExportDataExtraction_v913IMP.csv", $token)
		})
		// Mark records' forms as survey complete
		cy.visit_version({page: 'DataEntry/record_home.php', params: `pid=${pid}&arm=1&id=1`})
		cy.get('div#repeating_forms_table_parent').find('td.data').first().find('a').click()
		cy.get('#submit-btn-savecompresp').click({force: true})
		cy.visit_version({page: 'DataEntry/record_home.php', params: `pid=${pid}&arm=1&id=2`})
		cy.get('div#repeating_forms_table_parent').find('td.data').first().find('a').click()
		cy.get('#submit-btn-savecompresp').click({force: true})
	})

	describe('Basic Functionality', () => {

		before(() => {
			// Steps 1 (Step 2 not necessary)
			cy.set_user_type('standard')
		})

	    it('Should have the ability to mark fields as identifiers', () => {
			// Step 3
	        cy.visit_version({page: 'Design/online_designer.php', params: `pid=${pid}&page=export`})
			cy.get('table#design-lname').find('a').first().click()
			cy.get('input#field_phi1').click()
			cy.get('button').contains('Save').click()
			cy.get('table#design-fname').find('a').first().click()
			cy.get('input#field_phi1').click()
			cy.get('button').contains('Save').click()
			
			// Step 4
			cy.set_user_type('admin')
			cy.visit_version({page: 'ProjectSetup/index.php', params: `pid=${pid}`})
			cy.get('button').contains('Move project to production').click()
			cy.get('input#keep_data').click()
			cy.get('button').contains('YES, Move to Production Status').click()
			cy.get('div#actionMsg').should('be.visible')
			cy.set_user_type('standard')
	    })

	    it('Should have the ability to export all fields within a project', () => {
			// Steps 6 and 7
			cy.visit_version({page: 'DataExport/index.php', params: `pid=${pid}`})
			cy.get('tr#reprow_ALL').find('button.data_export_btn').contains('Export Data').click()
			cy.get('input[value="csvlabels"]').click()
			cy.export_csv_report().should((csv) => {
				expect(csv[0].length).to.equal(13)																// 13 columns
				expect(csv[0][0]).to.equal('Record ID')															// Headers are field labels
				expect(csv[1][csv[0].indexOf('Event Name')]).to.equal('Event 1')								// Data are labels
				expect([...new Set(csv.map((row) => row[0]).slice(1))].length).to.equal(8)						// 8 records
				expect(csv.length - 1).to.equal(19)																// 19 rows of data (subtract header)
				expect(csv.slice(1).reduce((acc, val) => acc + (val[2] === "Survey" ? 1 : 0), 0)).to.equal(11)	// 11 rows show Survey instrument
				expect(csv.slice(1).reduce((acc, val) => acc + (val[10] !== "" ? 1 : 0), 0)).to.equal(2)		// 2 rows show timestamps
			})

			cy.visit_version({page: 'DataExport/index.php', params: `pid=${pid}`})
			cy.get('tr#reprow_ALL').find('button.data_export_btn').contains('Export Data').click()
			cy.get('input[value="csvraw"]').click()
			cy.export_csv_report().should((csv) => {
				console.log(csv)
				expect(csv[0].length).to.equal(13)																// 13 columns
				expect(csv[0][0]).to.equal('record_id')															// Headers are raw field names
				expect(csv[1][csv[0].indexOf('redcap_event_name')]).to.equal('event_1_arm_1')					// Data are raw values
				expect([...new Set(csv.map((row) => row[0]).slice(1))].length).to.equal(8)						// 8 records
				expect(csv.length - 1).to.equal(19)																// 19 rows of data (subtract header)
				expect(csv.slice(1).reduce((acc, val) => acc + (val[2] === "survey" ? 1 : 0), 0)).to.equal(11)	// 11 rows show Survey instrument
				expect(csv.slice(1).reduce((acc, val) => acc + (val[10] !== "" ? 1 : 0), 0)).to.equal(2)		// 2 rows show timestamps
				
				expect(csv.filter((row) => (row[0] == "1" && row[csv[0].indexOf('dob')] !== ""))[0][csv[0].indexOf('dob')])
					.to.equal('2019-06-17')																		// Record 1 dob has value '6/17/19'
				
				expect(new Date(csv.filter((row) => {
						return (row[0] == "1" && row[csv[0].indexOf('survey_timestamp')] !== "")
					})[0][csv[0].indexOf('survey_timestamp')]).toLocaleDateString())
					.to.equal(new Date().toLocaleDateString())  												// Record 1 survey_timestamp is today
			})
	    })

	    it('Should allow the ability to export specific forms', () => {
			// Step 8

	    })
	})

	describe('Data Export Formats', () => {

		// Step 5

    	it('Should have the ability to export to CSV format', () => {

    	})

    	it('Should have the ability to export to SPSS format', () => {

    	})

    	it('Should have the ability to export to SAS format', () => {

    	})

    	it('Should have the ability to export to R format', () => {

    	})

		it('Should have the ability to export to STATA format', () => {

    	})

		it('Should have the ability to export to CDISC ODM (XML) format', () => {

    	})
    })

    describe('De-Identification Options', () => {

    	describe('Known Identifiers', () => {
			// Step 9

    		it('Should have the ability to remove all known identifier fields', () => {

    		})

    		it('Should have the ability to hash the Record ID', () => {
    			
    		})

    	})

    	describe('Free Form Text', () => {
			// Step 9

    		it('Should have the ability to remove unvalidated text fields', () => {
    			
    		})

    		it('Should have the ability to remove notes box fields', () => {
    			
    		})

    	})

    	describe('Date and Datetime Fields', () => {

    		it('Should have the ability to remove all date and datetime fields', () => {
				// Step 9
    			
    		})

    		it('Should have the ability to shift all dates by value between 0 and 364 days', () => {
				// Step 10
    			
    		})

    		it('Should have the ability to shift all survey completion timestamps by value between 0 and 364 days', () => {
				// Step 10
    			
    		})

    	})

    })

    describe('Export Permissions', () => {

		// Steps 11 - 14

    	it('Should have the ability to restrict users from exporting data', () => {

    	})
    })
})